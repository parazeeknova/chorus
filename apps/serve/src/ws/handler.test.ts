import { describe, expect, mock, test } from "bun:test";
import { createWsClientManager } from "../events/broadcaster";
import { createWsHandler } from "./handler";
import type { WsMessage } from "./types";

function makeMockBridge() {
  return {
    adapter: {
      sessions: {
        fork: mock(async () => ({ id: "sess-forked" })),
      },
    },
    races: {
      createRaceSessions: mock(
        async (_: string, models: { providerID: string; modelID: string }[]) =>
          models.map((_, i) => ({ id: `race-${i}` }))
      ),
      promptAll: mock(async () => undefined),
    },
    createSession: mock(async () => ({ id: "sess-123" })),
    promptSession: mock(async () => undefined),
    abortSession: mock(async () => true),
    replyPermission: mock(async () => true),
    getStatus: mock(() => ({
      connected: true,
      opencodeUrl: "http://localhost:4096",
      activeSessions: 2,
      uptime: 1000,
    })),
  };
}

describe("WebSocket handler", () => {
  test("creates WS handler with /ws endpoint", () => {
    const bridge = makeMockBridge();
    const wsManager = createWsClientManager();
    const handler = createWsHandler(bridge as never, wsManager);

    expect(handler).toBeDefined();
  });

  test("handler registers ws manager with empty clients", () => {
    const bridge = makeMockBridge();
    const wsManager = createWsClientManager();
    createWsHandler(bridge as never, wsManager);

    expect(wsManager.clients.size).toBe(0);
  });
});

describe("WS message type definitions", () => {
  test("task.queue message has correct shape", () => {
    const msg: WsMessage = {
      type: "task.queue",
      payload: {
        text: "build something",
        model: { providerID: "anthropic", modelID: "claude" },
        agent: "build",
      },
    };

    expect(msg.type).toBe("task.queue");
    expect(msg.payload.text).toBe("build something");
  });

  test("task.approve message has correct shape", () => {
    const msg: WsMessage = {
      type: "task.approve",
      payload: {
        requestID: "perm-1",
        sessionID: "sess-1",
        message: "approved",
      },
    };

    expect(msg.type).toBe("task.approve");
    expect(msg.payload.requestID).toBe("perm-1");
  });

  test("task.reject message has correct shape", () => {
    const msg: WsMessage = {
      type: "task.reject",
      payload: {
        requestID: "perm-2",
        sessionID: "sess-1",
      },
    };

    expect(msg.type).toBe("task.reject");
  });

  test("task.abort message has correct shape", () => {
    const msg: WsMessage = {
      type: "task.abort",
      payload: { sessionID: "sess-1" },
    };

    expect(msg.type).toBe("task.abort");
    expect(msg.payload.sessionID).toBe("sess-1");
  });

  test("task.redirect message supports soft and hard modes", () => {
    const softMsg: WsMessage = {
      type: "task.redirect",
      payload: {
        sessionID: "sess-1",
        text: "change approach",
        mode: "soft",
      },
    };

    const hardMsg: WsMessage = {
      type: "task.redirect",
      payload: {
        sessionID: "sess-1",
        text: "start fresh",
        mode: "hard",
      },
    };

    expect(softMsg.payload.mode).toBe("soft");
    expect(hardMsg.payload.mode).toBe("hard");
  });

  test("task.race message has correct shape", () => {
    const msg: WsMessage = {
      type: "task.race",
      payload: {
        parentSessionID: "sess-1",
        models: [
          { providerID: "anthropic", modelID: "claude" },
          { providerID: "openai", modelID: "gpt-4" },
        ],
        text: "solve this",
        baseTitle: "race test",
      },
    };

    expect(msg.type).toBe("task.race");
    expect(msg.payload.models.length).toBe(2);
  });

  test("viewport.sync message has correct shape", () => {
    const msg: WsMessage = {
      type: "viewport.sync",
      payload: {
        projectId: "proj-1",
        viewport: { x: 10, y: 20, zoom: 1.5 },
      },
    };

    expect(msg.type).toBe("viewport.sync");
    expect(msg.payload.viewport.x).toBe(10);
  });

  test("presence.ping message has no payload", () => {
    const msg: WsMessage = {
      type: "presence.ping",
    };

    expect(msg.type).toBe("presence.ping");
  });
});
