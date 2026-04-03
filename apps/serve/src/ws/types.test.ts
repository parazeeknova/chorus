import { describe, expect, mock, test } from "bun:test";
import { broadcast, sendResponse } from "./types";

function makeMockWs() {
  const sent: unknown[] = [];
  return {
    sent,
    send: mock((data: string) => {
      sent.push(data);
    }),
  };
}

describe("broadcast", () => {
  test("sends serialized event to all clients", () => {
    const ws1 = makeMockWs();
    const ws2 = makeMockWs();
    const clients = new Set([ws1, ws2] as never);

    const event = {
      type: "session.status",
      activity: "writing",
      sessionID: "sess-1",
      text: "hello",
    };

    broadcast(clients as never, event as never);
  });

  test("uses event.type as fallback when activity is missing", () => {
    const ws = makeMockWs();
    const clients = new Set([ws] as never);

    const event = {
      type: "session.error",
      sessionID: "sess-1",
    };

    broadcast(clients as never, event as never);

    const msg = JSON.parse(ws.sent[0] as string);
    expect(msg.type).toBe("agent.session.error");
  });
});

describe("sendResponse", () => {
  test("sends typed response to a single client", () => {
    const ws = makeMockWs();

    sendResponse(ws as never, "task.queued", {
      sessionID: "sess-1",
      accepted: true,
    });

    expect(ws.send).toHaveBeenCalledTimes(1);

    const msg = JSON.parse(ws.sent[0] as string);
    expect(msg.type).toBe("task.queued");
    expect(msg.payload.sessionID).toBe("sess-1");
    expect(msg.payload.accepted).toBe(true);
    expect(msg.timestamp).toBeDefined();
  });

  test("serializes arbitrary payload", () => {
    const ws = makeMockWs();

    sendResponse(ws as never, "custom.event", {
      foo: "bar",
      count: 42,
      nested: { key: "value" },
    });

    const msg = JSON.parse(ws.sent[0] as string);
    expect(msg.type).toBe("custom.event");
    expect(msg.payload).toEqual({
      foo: "bar",
      count: 42,
      nested: { key: "value" },
    });
  });
});
