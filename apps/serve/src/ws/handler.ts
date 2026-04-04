import { queueBoardPromptInputSchema } from "@chorus/contracts";
import { Elysia, t } from "elysia";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";
import type { WsClientManager } from "../events/broadcaster";
import type { BoardTaskService } from "../tasks/board-task-service";
import type { WsMessage } from "./types";
import {
  SUPPORTED_MESSAGE_TYPES,
  WS_MESSAGE_TYPE,
  WS_RESPONSE_TYPE,
} from "./types";

interface ClientData {
  sessionId: string;
  subscriptions: Set<string>;
}

const clientData = new WeakMap<object, ClientData>();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WS_PAYLOAD_SCHEMAS = {
  [WS_MESSAGE_TYPE.TASK_QUEUE]: t.Any(),
  [WS_MESSAGE_TYPE.TASK_APPROVE]: t.Object({
    requestID: t.String(),
    sessionID: t.String(),
    message: t.Optional(t.String()),
  }),
  [WS_MESSAGE_TYPE.TASK_REJECT]: t.Object({
    requestID: t.String(),
    sessionID: t.String(),
    message: t.Optional(t.String()),
  }),
  [WS_MESSAGE_TYPE.TASK_ABORT]: t.Object({
    sessionID: t.String(),
  }),
  [WS_MESSAGE_TYPE.TASK_REDIRECT]: t.Object({
    sessionID: t.String(),
    text: t.String(),
    mode: t.Union([t.Literal("soft"), t.Literal("hard")]),
  }),
  [WS_MESSAGE_TYPE.TASK_RACE]: t.Object({
    parentSessionID: t.String(),
    models: t.Array(
      t.Object({
        providerID: t.String(),
        modelID: t.String(),
      })
    ),
    text: t.String(),
    baseTitle: t.Optional(t.String()),
  }),
  [WS_MESSAGE_TYPE.VIEWPORT_SYNC]: t.Object({
    projectId: t.String(),
    viewport: t.Object({
      x: t.Number(),
      y: t.Number(),
      zoom: t.Number(),
    }),
  }),
} as const;

export function createWsHandler(
  bridge: OpenCodeBridge,
  manager: WsClientManager,
  boardTasks: BoardTaskService
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
          type: WS_RESPONSE_TYPE.CONNECTED,
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

      handleMessage(ws, message, bridge, manager, boardTasks, data).catch(
        (error) => {
          console.error("[ws] handler error:", error);
          ws.send(
            JSON.stringify({
              type: WS_RESPONSE_TYPE.ERROR,
              payload: {
                message:
                  error instanceof Error ? error.message : "unknown error",
              },
              timestamp: Date.now(),
            })
          );
        }
      );
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
  boardTasks: BoardTaskService,
  _data: ClientData
): Promise<void> {
  const wsSend = (payload: Record<string, unknown>) => {
    (ws as { send: (data: string) => void }).send(JSON.stringify(payload));
  };

  const msg = message as WsMessage;

  const validate = <T extends keyof typeof WS_PAYLOAD_SCHEMAS>(
    type: T,
    raw: unknown
  ) => {
    const schema = WS_PAYLOAD_SCHEMAS[type];
    if (!schema) {
      throw new Error(`No validation schema for message type: ${type}`);
    }
    return schema.Parse(raw);
  };

  switch (msg.type) {
    case WS_MESSAGE_TYPE.TASK_QUEUE: {
      validate(WS_MESSAGE_TYPE.TASK_QUEUE, msg.payload);
      const payload = queueBoardPromptInputSchema.parse(msg.payload);
      const response = await boardTasks.queuePrompt(payload);

      wsSend({
        type: WS_RESPONSE_TYPE.TASK_QUEUED,
        payload: response,
        timestamp: response.timestamp,
      });
      break;
    }

    case WS_MESSAGE_TYPE.TASK_APPROVE: {
      const payload = validate(WS_MESSAGE_TYPE.TASK_APPROVE, msg.payload);

      const result = await bridge.replyPermission({
        requestID: payload.requestID,
        sessionID: payload.sessionID,
        reply: "once",
        message: payload.message,
      });

      wsSend({
        type: WS_RESPONSE_TYPE.TASK_APPROVED,
        payload: {
          requestID: payload.requestID,
          accepted: result,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case WS_MESSAGE_TYPE.TASK_REJECT: {
      const payload = validate(WS_MESSAGE_TYPE.TASK_REJECT, msg.payload);

      const result = await bridge.replyPermission({
        requestID: payload.requestID,
        sessionID: payload.sessionID,
        reply: "reject",
        message: payload.message,
      });

      wsSend({
        type: WS_RESPONSE_TYPE.TASK_REJECTED,
        payload: {
          requestID: payload.requestID,
          accepted: result,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case WS_MESSAGE_TYPE.TASK_ABORT: {
      const payload = validate(WS_MESSAGE_TYPE.TASK_ABORT, msg.payload);

      const result = await bridge.abortSession(payload.sessionID);

      wsSend({
        type: WS_RESPONSE_TYPE.TASK_ABORTED,
        payload: {
          sessionID: payload.sessionID,
          accepted: result,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case WS_MESSAGE_TYPE.TASK_REDIRECT: {
      const payload = validate(WS_MESSAGE_TYPE.TASK_REDIRECT, msg.payload);

      if (payload.mode === "soft") {
        await bridge.promptSession({
          sessionID: payload.sessionID,
          text: `Redirect instruction: ${payload.text}`,
        });

        wsSend({
          type: WS_RESPONSE_TYPE.TASK_REDIRECTED,
          payload: {
            sessionID: payload.sessionID,
            mode: payload.mode,
          },
          timestamp: Date.now(),
        });
        break;
      }

      const forked = await bridge.forkSession({
        sessionID: payload.sessionID,
      });

      await bridge.promptSession({
        sessionID: forked.id,
        text: payload.text,
      });

      wsSend({
        type: WS_RESPONSE_TYPE.TASK_REDIRECTED,
        payload: {
          originalSessionID: payload.sessionID,
          newSessionID: forked.id,
        },
        timestamp: Date.now(),
      });
      break;
    }

    case WS_MESSAGE_TYPE.TASK_RACE: {
      const payload = validate(WS_MESSAGE_TYPE.TASK_RACE, msg.payload);

      const sessions = await bridge.startRace(
        payload.parentSessionID,
        payload.models,
        payload.baseTitle
      );

      await bridge.promptRace(
        sessions.map((s, i) => ({
          sessionID: s.id,
          model: payload.models[i] ?? payload.models[0],
        })),
        payload.text
      );

      wsSend({
        type: WS_RESPONSE_TYPE.TASK_RACE_STARTED,
        payload: {
          raceSessions: sessions.map((s) => s.id),
        },
        timestamp: Date.now(),
      });
      break;
    }

    case WS_MESSAGE_TYPE.VIEWPORT_SYNC: {
      const payload = validate(WS_MESSAGE_TYPE.VIEWPORT_SYNC, msg.payload);

      const rawMessage = JSON.stringify({
        type: WS_MESSAGE_TYPE.VIEWPORT_SYNC,
        payload,
        timestamp: Date.now(),
      });

      manager.broadcastRaw(rawMessage);
      break;
    }

    case WS_MESSAGE_TYPE.PRESENCE_PING: {
      wsSend({
        type: WS_RESPONSE_TYPE.PRESENCE_PONG,
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
        type: WS_RESPONSE_TYPE.UNKNOWN_MESSAGE,
        payload: {
          receivedType: rawType,
          supportedTypes: [...SUPPORTED_MESSAGE_TYPES],
        },
        timestamp: Date.now(),
      });
      break;
    }
  }
}
