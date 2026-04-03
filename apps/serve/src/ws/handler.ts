import { Elysia, t } from "elysia";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";
import type { WsClientManager } from "../events/broadcaster";
import type { WsMessage } from "./types";

interface ClientData {
  sessionId: string;
  subscriptions: Set<string>;
}

const clientData = new WeakMap<object, ClientData>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createWsHandler(
  bridge: OpenCodeBridge,
  manager: WsClientManager
) {
  return new Elysia().ws("/ws", {
    body: t.Object({
      type: t.String(),
      payload: t.Optional(t.Any()),
    }),

    open(ws) {
      const sessionId = generateId();
      const data: ClientData = {
        sessionId,
        subscriptions: new Set(),
      };
      clientData.set(ws, data);
      manager.clients.add(ws as never);
      console.log(`[ws] client connected: ${sessionId}`);
      ws.send(
        JSON.stringify({
          type: "connected",
          payload: { sessionId },
          timestamp: Date.now(),
        })
      );
    },

    message(ws, message) {
      const data = clientData.get(ws);
      if (!data) {
        return;
      }

      handleMessage(ws, message, bridge, manager, data).catch((error) => {
        console.error("[ws] handler error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: {
              message: error instanceof Error ? error.message : "unknown error",
            },
            timestamp: Date.now(),
          })
        );
      });
    },

    close(ws) {
      manager.clients.delete(ws as never);
      const data = clientData.get(ws);
      if (data) {
        console.log(`[ws] client disconnected: ${data.sessionId}`);
      }
      clientData.delete(ws);
    },

    drain(ws) {
      const data = clientData.get(ws);
      if (data) {
        console.log(`[ws] client backpressure: ${data.sessionId}`);
      }
    },
  });
}

async function handleMessage(
  ws: unknown,
  message: { type: string; payload?: unknown },
  bridge: OpenCodeBridge,
  manager: WsClientManager,
  _data: ClientData
): Promise<void> {
  const wsSend = (payload: Record<string, unknown>) => {
    (ws as { send: (data: string) => void }).send(JSON.stringify(payload));
  };

  const msg = message as WsMessage;

  switch (msg.type) {
    case "task.queue": {
      const payload = (msg as Extract<WsMessage, { type: "task.queue" }>)
        .payload;
      const session = await bridge.createSession({
        title: payload.text.slice(0, 80),
      });

      await bridge.promptSession({
        sessionID: session.id,
        text: payload.text,
        model: payload.model,
        agent: payload.agent,
      });

      wsSend({
        type: "task.queued",
        payload: {
          sessionID: session.id,
          accepted: true,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case "task.approve": {
      const payload = (msg as Extract<WsMessage, { type: "task.approve" }>)
        .payload;
      const result = await bridge.replyPermission({
        requestID: payload.requestID,
        sessionID: payload.sessionID,
        reply: "once",
        message: payload.message,
      });

      wsSend({
        type: "task.approved",
        payload: {
          requestID: payload.requestID,
          accepted: result,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case "task.reject": {
      const payload = (msg as Extract<WsMessage, { type: "task.reject" }>)
        .payload;
      const result = await bridge.replyPermission({
        requestID: payload.requestID,
        sessionID: payload.sessionID,
        reply: "reject",
        message: payload.message,
      });

      wsSend({
        type: "task.rejected",
        payload: {
          requestID: payload.requestID,
          accepted: result,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case "task.abort": {
      const payload = (msg as Extract<WsMessage, { type: "task.abort" }>)
        .payload;
      const result = await bridge.abortSession(payload.sessionID);

      wsSend({
        type: "task.aborted",
        payload: {
          sessionID: payload.sessionID,
          accepted: result,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case "task.redirect": {
      const payload = (msg as Extract<WsMessage, { type: "task.redirect" }>)
        .payload;

      if (payload.mode === "soft") {
        await bridge.promptSession({
          sessionID: payload.sessionID,
          text: `Redirect instruction: ${payload.text}`,
        });
      } else {
        const forked = await bridge.adapter.sessions.fork({
          sessionID: payload.sessionID,
        });

        await bridge.promptSession({
          sessionID: forked.id,
          text: payload.text,
        });

        wsSend({
          type: "task.redirected",
          payload: {
            originalSessionID: payload.sessionID,
            newSessionID: forked.id,
          },
          timestamp: Date.now(),
        });
        break;
      }

      wsSend({
        type: "task.redirected",
        payload: {
          sessionID: payload.sessionID,
          mode: payload.mode,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case "task.race": {
      const payload = (msg as Extract<WsMessage, { type: "task.race" }>)
        .payload;
      const sessions = await bridge.races.createRaceSessions(
        payload.parentSessionID,
        payload.models,
        payload.baseTitle
      );

      await bridge.races.promptAll(
        sessions.map((s, i) => ({
          sessionID: s.id,
          model: payload.models[i] ?? payload.models[0],
        })),
        payload.text
      );

      wsSend({
        type: "task.race.started",
        payload: {
          raceSessions: sessions.map((s) => s.id),
        },
        timestamp: Date.now(),
      });
      break;
    }

    case "viewport.sync": {
      manager.broadcast({
        type: "viewport.sync",
        payload: msg.payload,
        timestamp: Date.now(),
      } as Parameters<typeof manager.broadcast>[0]);
      break;
    }

    case "presence.ping": {
      wsSend({
        type: "presence.pong",
        payload: {
          timestamp: Date.now(),
          clientCount: manager.clients.size,
        },
        timestamp: Date.now(),
      });
      break;
    }

    default: {
      const rawType = (message as { type: string }).type;
      wsSend({
        type: "unknown.message",
        payload: {
          receivedType: rawType,
          supportedTypes: [
            "task.queue",
            "task.approve",
            "task.reject",
            "task.abort",
            "task.redirect",
            "task.race",
            "viewport.sync",
            "presence.ping",
          ],
        },
        timestamp: Date.now(),
      });
      break;
    }
  }
}
