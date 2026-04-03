import { Elysia } from "elysia";
import { policyRoutes } from "./routes/policy";
import { voiceRoutes } from "./routes/voice";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(voiceRoutes)
  .use(policyRoutes)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
