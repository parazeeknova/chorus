/**
 * Elysia serve backend bundled into the desktop app
 *
 * This imports and starts the full Chorus serve backend from apps/serve
 * and adds web frontend serving
 */

import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
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
import { WorkspaceStore } from "../../../serve/src/workspace/store";
import { createWsHandler } from "../../../serve/src/ws/handler";

let shutdownFn: (() => void) | null = null;

// Web frontend configuration
const WEB_DEV_URL = "http://localhost:3000"; // Next.js dev server
const WEB_PROD_DIR = path.join(import.meta.dirname, "../../../web/dist"); // Static export

/**
 * Serve web frontend - proxies to Next.js dev server in development,
 * serves static files in production
 */
async function serveWebFrontend(pathname: string): Promise<Response> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // Development: Proxy to Next.js dev server
    try {
      const targetUrl = `${WEB_DEV_URL}${pathname}`;
      const response = await fetch(targetUrl, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      return response;
    } catch (error) {
      console.error("Failed to proxy to Next.js dev server:", error);
      return new Response(
        `<html><body><h1>Next.js Dev Server Not Running</h1>
        <p>Please start the Next.js dev server with: <code>cd apps/web && bun run dev</code></p>
        <p>Or build the static export: <code>cd apps/web && bun run build</code></p></body></html>`,
        { status: 503, headers: { "Content-Type": "text/html" } }
      );
    }
  } else {
    // Production: Serve static files
    try {
      // Try to serve the file directly
      const filePath = path.join(
        WEB_PROD_DIR,
        pathname === "/" ? "index.html" : pathname
      );
      const content = await readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = getContentType(ext);
      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      // If file not found, try serving index.html (SPA fallback)
      try {
        const indexPath = path.join(WEB_PROD_DIR, "index.html");
        const content = await readFile(indexPath);
        return new Response(content, {
          headers: { "Content-Type": "text/html" },
        });
      } catch {
        return new Response("Web frontend not found. Please build the app.", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
  };
  return types[ext] || "application/octet-stream";
}

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
    // Web frontend routes - catch all HTML/asset requests
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
      process.env.NODE_ENV === "production" ? "static" : `proxy:${WEB_DEV_URL}`,
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
