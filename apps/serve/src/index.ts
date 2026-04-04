import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createLogger } from "@chorus/logger";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { OpenCodeBridge } from "./bridge/opencode/bridge";
import { loadConfig } from "./config";
import { createWsClientManager } from "./events/broadcaster";
import { NativeFolderPicker } from "./projects/folder-picker";
import { ProjectService } from "./projects/service";
import { createHttpRoutes } from "./routes";
import { policyRoutes } from "./routes/policy";
import { createProjectRoutes } from "./routes/projects";
import { voiceRoutes } from "./routes/voice";
import { createWorkspaceRoutes } from "./routes/workspace";
import { BoardTaskService } from "./tasks/board-task-service";
import { WorkspaceStore } from "./workspace/store";
import { createWsHandler } from "./ws/handler";

const config = loadConfig();
const logger = createLogger(
  {
    env: process.env.NODE_ENV === "production" ? "production" : "development",
  },
  "SERVE"
);

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

const workspaceStore = new WorkspaceStore(await resolveWorkspaceSnapshotPath());
await workspaceStore.load();
const boardTasks = new BoardTaskService(bridge, workspaceStore);
const projectService = new ProjectService(
  config.opencodeBaseUrl,
  config.opencodeDirectory,
  new NativeFolderPicker()
);

bridge.subscribe((event) => {
  wsManager.broadcast(event);
  logger.debug("bridge-event", { event: JSON.stringify(event) });
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
        error instanceof Error ? error : undefined
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
  .get("/", () => "Hello Elysia")
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
  ws: `ws://${app.server?.hostname}:${app.server?.port}/ws`,
});

try {
  await bridge.start();
  logger.info("bridge-connected", { url: config.opencodeBaseUrl });
} catch (error) {
  logger.error("bridge-failed", error instanceof Error ? error : undefined, {
    url: config.opencodeBaseUrl,
  });
}
