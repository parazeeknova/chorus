import { describe, expect, mock, test } from "bun:test";
import { createWsClientManager } from "./broadcaster";

function makeMockWs() {
  const sent: unknown[] = [];
  return {
    sent,
    send: mock((data: string) => {
      sent.push(data);
    }),
  };
}

describe("createWsClientManager", () => {
  test("creates a manager with empty clients set", () => {
    const manager = createWsClientManager();

    expect(manager.clients.size).toBe(0);
    expect(typeof manager.broadcast).toBe("function");
  });

  test("broadcasts event to all connected clients", () => {
    const manager = createWsClientManager();
    const ws1 = makeMockWs();
    const ws2 = makeMockWs();

    manager.clients.add(ws1 as never);
    manager.clients.add(ws2 as never);

    const event = {
      type: "message.part.updated",
      activity: "writing",
      sessionID: "sess-1",
      text: "hello",
      timestamp: Date.now(),
    };

    manager.broadcast(event as never);

    expect(ws1.send).toHaveBeenCalledTimes(1);
    expect(ws2.send).toHaveBeenCalledTimes(1);

    const msg1 = JSON.parse(ws1.sent[0] as string);
    const msg2 = JSON.parse(ws2.sent[0] as string);

    expect(msg1.type).toBe("agent.writing");
    expect(msg1.payload.sessionID).toBe("sess-1");
    expect(msg2.type).toBe("agent.writing");
    expect(msg2.payload.sessionID).toBe("sess-1");
  });

  test("broadcasts to no clients when set is empty", () => {
    const manager = createWsClientManager();

    const event = {
      type: "session.status",
      activity: "idle",
      sessionID: "sess-1",
      timestamp: Date.now(),
    };

    expect(() => manager.broadcast(event as never)).not.toThrow();
  });

  test("uses event.type as fallback when activity is missing", () => {
    const manager = createWsClientManager();
    const ws = makeMockWs();

    manager.clients.add(ws as never);

    const event = {
      type: "session.error",
      sessionID: "sess-1",
      timestamp: Date.now(),
    };

    manager.broadcast(event as never);

    const msg = JSON.parse(ws.sent[0] as string);
    expect(msg.type).toBe("agent.session.error");
  });

  test("includes timestamp in broadcast message", () => {
    const manager = createWsClientManager();
    const ws = makeMockWs();

    manager.clients.add(ws as never);

    const before = Date.now();

    const event = {
      type: "session.idle",
      activity: "idle",
      sessionID: "sess-1",
    };

    manager.broadcast(event as never);

    const after = Date.now();
    const msg = JSON.parse(ws.sent[0] as string);

    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });

  test("tracks clients added and removed", () => {
    const manager = createWsClientManager();
    const ws = makeMockWs();

    expect(manager.clients.size).toBe(0);

    manager.clients.add(ws as never);
    expect(manager.clients.size).toBe(1);

    manager.clients.delete(ws as never);
    expect(manager.clients.size).toBe(0);
  });
});
