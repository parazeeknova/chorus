import { describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import { createHttpRoutes } from "./index";

function makeMockBridge() {
  return {
    adapter: {
      sessions: {
        fork: mock(async () => ({ id: "sess-forked" })),
      },
    },
    races: {
      createRaceSessions: mock(
        async (
          _: string,
          models: Array<{ providerID: string; modelID: string }>
        ) => models.map((_, i) => ({ id: `race-${i}` }))
      ),
      promptAll: mock(async () => undefined),
    },
    createSession: mock(async () => ({ id: "sess-123" })),
    promptSession: mock(async () => ({})),
    abortSession: mock(async () => true),
    replyPermission: mock(async () => true),
    forkSession: mock(async () => ({ id: "sess-forked" })),
    startRace: mock(
      async (
        _: string,
        models: Array<{ providerID: string; modelID: string }>
      ) => models.map((_, i) => ({ id: `race-${i}` }))
    ),
    promptRace: mock(async () => undefined),
    getStatus: mock(() => ({
      connected: true,
      opencodeUrl: "http://localhost:4096",
      activeSessions: 2,
      uptime: 1000,
    })),
  };
}
describe("HTTP routes", () => {
  function makeApp() {
    const bridge = makeMockBridge();
    const app = new Elysia().use(createHttpRoutes(bridge as never));
    return { app, bridge };
  }

  describe("GET /health", () => {
    test("returns ok status with timestamp", async () => {
      const { app } = makeApp();

      const res = await app.handle(new Request("http://localhost/health"));

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        status: "ok",
        timestamp: expect.any(Number),
      });
    });
  });

  describe("GET /bridge/status", () => {
    test("returns bridge status", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/bridge/status")
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        connected: true,
        opencodeUrl: "http://localhost:4096",
        activeSessions: 2,
        uptime: 1000,
      });
    });
  });

  describe("POST /tasks", () => {
    test("creates a session and prompts it", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "build a feature" }),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        sessionID: "sess-123",
        accepted: true,
        timestamp: expect.any(Number),
      });

      expect(bridge.createSession).toHaveBeenCalledWith({
        title: "build a feature",
      });

      expect(bridge.promptSession).toHaveBeenCalledWith({
        sessionID: "sess-123",
        text: "build a feature",
        model: undefined,
        agent: undefined,
      });
    });

    test("truncates title to 80 chars", async () => {
      const { app, bridge } = makeApp();
      const longText = "a".repeat(200);

      await app.handle(
        new Request("http://localhost/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: longText }),
        })
      );

      expect(bridge.createSession).toHaveBeenCalledWith({
        title: "a".repeat(80),
      });
    });

    test("passes model and agent when provided", async () => {
      const { app, bridge } = makeApp();

      await app.handle(
        new Request("http://localhost/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: "do work",
            model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
            agent: "build",
          }),
        })
      );

      expect(bridge.promptSession).toHaveBeenCalledWith({
        sessionID: "sess-123",
        text: "do work",
        model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
        agent: "build",
      });
    });

    test("rejects missing text", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("POST /tasks/:sessionID/approve", () => {
    test("approves a permission request", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestID: "perm-1" }),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        sessionID: "sess-1",
        requestID: "perm-1",
        accepted: true,
        timestamp: expect.any(Number),
      });

      expect(bridge.replyPermission).toHaveBeenCalledWith({
        requestID: "perm-1",
        sessionID: "sess-1",
        reply: "once",
        message: undefined,
      });
    });

    test("passes optional message", async () => {
      const { app, bridge } = makeApp();

      await app.handle(
        new Request("http://localhost/tasks/sess-1/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestID: "perm-1", message: "approved" }),
        })
      );

      expect(bridge.replyPermission).toHaveBeenCalledWith({
        requestID: "perm-1",
        sessionID: "sess-1",
        reply: "once",
        message: "approved",
      });
    });

    test("rejects missing requestID", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("POST /tasks/:sessionID/reject", () => {
    test("rejects a permission request", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/reject", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestID: "perm-1" }),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        sessionID: "sess-1",
        requestID: "perm-1",
        accepted: true,
        timestamp: expect.any(Number),
      });

      expect(bridge.replyPermission).toHaveBeenCalledWith({
        requestID: "perm-1",
        sessionID: "sess-1",
        reply: "reject",
        message: undefined,
      });
    });
  });

  describe("POST /tasks/:sessionID/abort", () => {
    test("aborts a running session", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/abort", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        sessionID: "sess-1",
        accepted: true,
        timestamp: expect.any(Number),
      });

      expect(bridge.abortSession).toHaveBeenCalledWith("sess-1");
    });

    test("rejects missing sessionID param", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks//abort", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /tasks/:sessionID/redirect", () => {
    test("soft redirect prompts the same session", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/redirect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "change approach", mode: "soft" }),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        sessionID: "sess-1",
        mode: "soft",
        timestamp: expect.any(Number),
      });

      expect(bridge.promptSession).toHaveBeenCalledWith({
        sessionID: "sess-1",
        text: "Redirect instruction: change approach",
      });
    });

    test("hard redirect forks the session", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/redirect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "start fresh", mode: "hard" }),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        originalSessionID: "sess-1",
        newSessionID: "sess-forked",
        mode: "hard",
        timestamp: expect.any(Number),
      });

      expect(bridge.forkSession).toHaveBeenCalledWith({
        sessionID: "sess-1",
      });

      expect(bridge.promptSession).toHaveBeenCalledWith({
        sessionID: "sess-forked",
        text: "start fresh",
      });
    });

    test("rejects invalid mode", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/redirect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "test", mode: "invalid" }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("rejects missing text", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/redirect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "soft" }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("POST /tasks/:sessionID/race", () => {
    test("creates race sessions and prompts all", async () => {
      const { app, bridge } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/race", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            models: [
              { providerID: "anthropic", modelID: "claude-sonnet-4" },
              { providerID: "openai", modelID: "gpt-4.1" },
            ],
            text: "solve this",
            baseTitle: "race test",
          }),
        })
      );

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        raceSessions: ["race-0", "race-1"],
        timestamp: expect.any(Number),
      });

      expect(bridge.startRace).toHaveBeenCalledWith(
        "sess-1",
        [
          { providerID: "anthropic", modelID: "claude-sonnet-4" },
          { providerID: "openai", modelID: "gpt-4.1" },
        ],
        "race test"
      );

      expect(bridge.promptRace).toHaveBeenCalled();
    });

    test("rejects missing models", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/race", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "solve this" }),
        })
      );

      expect(res.status).toBe(422);
    });

    test("rejects missing text", async () => {
      const { app } = makeApp();

      const res = await app.handle(
        new Request("http://localhost/tasks/sess-1/race", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            models: [{ providerID: "anthropic", modelID: "claude" }],
          }),
        })
      );

      expect(res.status).toBe(422);
    });
  });
});
