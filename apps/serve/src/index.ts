import { Elysia } from "elysia";
import { OpenCodeBridge } from "./bridge/opencode/bridge";
import { loadConfig } from "./config";
import { createWsClientManager } from "./events/broadcaster";
import { createHttpRoutes } from "./routes";
import { createWsHandler } from "./ws/handler";

const config = loadConfig();
const bridge = new OpenCodeBridge(
  config.opencodeBaseUrl,
  config.opencodeDirectory
);
const wsManager = createWsClientManager();

bridge.subscribe((event) => {
  wsManager.broadcast(event);
});

const app = new Elysia()
  .use(createHttpRoutes(bridge))
  .use(createWsHandler(bridge, wsManager))
  .listen(config.port);

console.log(
  `Chorus bridge running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`   OpenCode: ${config.opencodeBaseUrl}`);
console.log(`   Directory: ${config.opencodeDirectory}`);
console.log(
  `   WebSocket: ws://${app.server?.hostname}:${app.server?.port}/ws`
);

try {
  await bridge.start();
} catch (error) {
  console.error(
    "[bridge] failed to connect to OpenCode:",
    error instanceof Error ? error.message : error
  );
  console.error("[bridge] HTTP and WebSocket endpoints remain available");
  console.error("[bridge] Restart the bridge once OpenCode is reachable");
}
