/**
 * Elysia serve backend bundled into the desktop app
 *
 * This imports and starts the full Chorus serve backend from apps/serve
 * Uses shared web-frontend module for consistency
 */

import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createLogger } from "@chorus/logger";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { OpenCodeBridge } from "../../../serve/src/bridge/opencode/bridge";
import { loadConfig } from "../../../serve/src/config";
import { createWsClientManager } from "../../../serve/src/events/broadcaster";
import { OpenCodeProcessManager } from "../../../serve/src/opencode/process-manager";
import { NativeFolderPicker } from "../../../serve/src/projects/folder-picker";
import { ProjectService } from "../../../serve/src/projects/service";
import { createHttpRoutes } from "../../../serve/src/routes";
import { policyRoutes } from "../../../serve/src/routes/policy";
import { createProjectRoutes } from "../../../serve/src/routes/projects";
import { voiceRoutes } from "../../../serve/src/routes/voice";
import { createWorkspaceRoutes } from "../../../serve/src/routes/workspace";
import { BoardTaskService } from "../../../serve/src/tasks/board-task-service";
import { serveWebFrontend } from "../../../serve/src/web-frontend";
import { WorkspaceStore } from "../../../serve/src/workspace/store";
import { createWsHandler } from "../../../serve/src/ws/handler";

let shutdownFn: (() => void) | null = null;

/**
 * Start the Chorus serve backend
 * @returns The port the server is running on
 */
export async function startServer(): Promise<number> {
  const config = loadConfig();
  const logger = createLogger(
    {
      env: process.env.NODE_ENV === "production" ? "production" : "development",
    },
    "SERVE"
  );

  const processManager = new OpenCodeProcessManager({
    directory: config.opencodeDirectory,
  });

  if (config.autoStartOpencode) {
    await processManager.start();
  }

  const bridge = new OpenCodeBridge(
    config.opencodeBaseUrl,
    config.opencodeDirectory
  );
  const wsManager = createWsClientManager();

  async function resolveWorkspaceSnapshotPath() {
    const homeWorkspaceDir = path.join(homedir(), ".chorus");
    const homeWorkspacePath = path.join(homeWorkspaceDir, "workspace.json");
    const legacyWorkspacePath = path.join(
      process.cwd(),
      ".chorus",
      "workspace.json"
    );

    await mkdir(homeWorkspaceDir, { recursive: true });

    try {
      await access(homeWorkspacePath);
      return homeWorkspacePath;
    } catch {
      // No home snapshot yet. Fall through to migration check.
    }

    try {
      await access(legacyWorkspacePath);
      await copyFile(legacyWorkspacePath, homeWorkspacePath);
      await rm(legacyWorkspacePath, { force: true });
      logger.info("workspace-snapshot-migrated", {
        from: legacyWorkspacePath,
        to: homeWorkspacePath,
      });
    } catch {
      // No legacy snapshot to migrate.
    }

    return homeWorkspacePath;
  }

  const workspaceStore = new WorkspaceStore(
    await resolveWorkspaceSnapshotPath()
  );
  await workspaceStore.load();
  const boardTasks = new BoardTaskService(bridge, workspaceStore);
  const projectService = new ProjectService(
    config.opencodeBaseUrl,
    config.opencodeDirectory,
    new NativeFolderPicker()
  );

  bridge.subscribe((event) => {
    wsManager.broadcast(event);

    if (event.type === "server.heartbeat") {
      return;
    }

    if (!(event.sessionID && event.activity)) {
      return;
    }

    workspaceStore
      .applyAgentEvent(event)
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }

        wsManager.broadcastRaw(
          JSON.stringify({
            type: "workspace.updated",
            payload: snapshot,
            timestamp: Date.now(),
          })
        );
      })
      .catch((error) => {
        logger.error(
          "workspace-projection-failed",
          error instanceof Error ? error : undefined,
          {
            sessionID: event.sessionID,
            eventType: event.type,
          }
        );
      });
  });

  const app = new Elysia()
    .use(cors())
    .onStart(() => {
      logger.info("server-starting", { port: config.port });
    })
    .onError(({ error, code }) => {
      logger.error(
        `server-error: ${code}`,
        error instanceof Error ? error : undefined
      );
    })
    // Web frontend routes
    .get("/", () => serveWebFrontend("/"))
    .get("/*", ({ request }) => {
      const url = new URL(request.url);
      return serveWebFrontend(url.pathname);
    })
    // API routes
    .use(createHttpRoutes(bridge, boardTasks, wsManager))
    .use(createProjectRoutes(projectService))
    .use(createWorkspaceRoutes(workspaceStore, wsManager))
    .use(voiceRoutes)
    .use(policyRoutes)
    .use(createWsHandler(bridge, wsManager, boardTasks))
    .listen(config.port);

  logger.info("server-running", {
    host: app.server?.hostname,
    port: app.server?.port,
    opencode: config.opencodeBaseUrl,
    directory: config.opencodeDirectory,
    webFrontend:
      process.env.NODE_ENV === "production"
        ? "static"
        : `proxy:${"http://localhost:3000"}`,
  });

  try {
    await bridge.start();
    logger.info("bridge-connected", { url: config.opencodeBaseUrl });
  } catch (error) {
    logger.error("bridge-failed", error instanceof Error ? error : undefined, {
      url: config.opencodeBaseUrl,
    });
  }

  // Store shutdown function for later
  shutdownFn = () => {
    logger.info("server-shutting-down");
    try {
      wsManager.close();
      bridge.stop();
      processManager.stop();
      app.server?.stop();
      logger.info("server-shutdown-complete");
    } catch (error) {
      logger.error(
        "server-shutdown-error",
        error instanceof Error ? error : undefined
      );
    }
  };

  // Handle process signals
  process.on("SIGINT", () => {
    if (shutdownFn) {
      shutdownFn();
    }
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    if (shutdownFn) {
      shutdownFn();
    }
    process.exit(0);
  });

  return config.port;
}

/**
 * Stop the Chorus serve backend
 */
export function stopServer(): void {
  if (shutdownFn) {
    shutdownFn();
    shutdownFn = null;
  }
}
