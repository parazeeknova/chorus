import { queueBoardPromptInputSchema } from "@chorus/contracts";
import { createLogger } from "@chorus/logger";
import { Elysia, t } from "elysia";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";
import type { WsClientManager } from "../events/broadcaster";
import type { BoardTaskService } from "../tasks/board-task-service";
import { createWorkspaceMessage } from "./workspace";

const logger = createLogger(
  {
    env: process.env.NODE_ENV === "production" ? "production" : "development",
  },
  "ROUTES"
);

export function createHttpRoutes(
  bridge: OpenCodeBridge,
  boardTasks: BoardTaskService,
  wsManager: WsClientManager
) {
  return new Elysia()
    .get("/health", () => ({
      status: "ok",
      timestamp: Date.now(),
    }))

    .get("/bridge/status", () => bridge.getStatus())

    .post(
      "/tasks",
      ({ body, set }) => {
        const parsed = queueBoardPromptInputSchema.safeParse(body);
        if (!parsed.success) {
          set.status = 422;
          return {
            code: "invalid_task_payload",
            issues: parsed.error.issues,
          };
        }

        return boardTasks.queuePrompt(parsed.data).then((result) => {
          wsManager.broadcastRaw(
            createWorkspaceMessage(boardTasks.getWorkspaceSnapshot())
          );
          return result;
        });
      },
      {
        body: t.Any(),
      }
    )

    .post(
      "/tasks/:sessionID/approve",
      async ({ params, body }) => {
        const result = await bridge.replyPermission({
          requestID: body.requestID,
          sessionID: params.sessionID,
          reply: "once",
          message: body.message,
        });

        return {
          sessionID: params.sessionID,
          requestID: body.requestID,
          accepted: result,
          timestamp: Date.now(),
        };
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
        body: t.Object({
          requestID: t.String(),
          message: t.Optional(t.String()),
        }),
      }
    )

    .post(
      "/tasks/:sessionID/reject",
      async ({ params, body }) => {
        const result = await bridge.replyPermission({
          requestID: body.requestID,
          sessionID: params.sessionID,
          reply: "reject",
          message: body.message,
        });

        return {
          sessionID: params.sessionID,
          requestID: body.requestID,
          accepted: result,
          timestamp: Date.now(),
        };
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
        body: t.Object({
          requestID: t.String(),
          message: t.Optional(t.String()),
        }),
      }
    )

    .post(
      "/tasks/:sessionID/abort",
      async ({ params }) => {
        const result = await bridge.abortSession(params.sessionID);

        return {
          sessionID: params.sessionID,
          accepted: result,
          timestamp: Date.now(),
        };
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
      }
    )

    .post(
      "/tasks/:sessionID/redirect",
      async ({ params, body }) => {
        if (body.mode === "soft") {
          await bridge.promptSession({
            sessionID: params.sessionID,
            text: `Redirect instruction: ${body.text}`,
          });

          return {
            sessionID: params.sessionID,
            mode: body.mode,
            timestamp: Date.now(),
          };
        }

        const forked = await bridge.forkSession({
          sessionID: params.sessionID,
        });

        await bridge.promptSession({
          sessionID: forked.id,
          text: body.text,
        });

        return {
          originalSessionID: params.sessionID,
          newSessionID: forked.id,
          mode: body.mode,
          timestamp: Date.now(),
        };
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
        body: t.Object({
          text: t.String(),
          mode: t.Union([t.Literal("soft"), t.Literal("hard")]),
        }),
      }
    )

    .post(
      "/tasks/:sessionID/race",
      async ({ params, body }) => {
        const sessions = await bridge.startRace(
          params.sessionID,
          body.models,
          body.baseTitle
        );

        await bridge.promptRace(
          sessions.map((s, i) => ({
            sessionID: s.id,
            model: body.models[i] ?? body.models[0],
          })),
          body.text
        );

        return {
          raceSessions: sessions.map((s) => s.id),
          timestamp: Date.now(),
        };
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
        body: t.Object({
          models: t.Array(
            t.Object({
              providerID: t.String(),
              modelID: t.String(),
            })
          ),
          text: t.String(),
          baseTitle: t.Optional(t.String()),
        }),
      }
    )

    .post(
      "/sessions/:sessionID/revert",
      async ({ params }) => {
        try {
          logger.debug("Reverting session", { sessionID: params.sessionID });
          await bridge.revertSession(params.sessionID);
          logger.info("Session reverted", { sessionID: params.sessionID });
          return { success: true, timestamp: Date.now() };
        } catch (error) {
          logger.error("Failed to revert session", error, {
            sessionID: params.sessionID,
          });
          throw error;
        }
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
      }
    )

    .post(
      "/sessions/:sessionID/unrevert",
      async ({ params }) => {
        try {
          logger.debug("Unreverting session", { sessionID: params.sessionID });
          await bridge.unrevertSession(params.sessionID);
          logger.info("Session unreverted", { sessionID: params.sessionID });
          return { success: true, timestamp: Date.now() };
        } catch (error) {
          logger.error("Failed to unrevert session", error, {
            sessionID: params.sessionID,
          });
          throw error;
        }
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
      }
    );
}
