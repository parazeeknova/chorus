import { queueBoardPromptInputSchema } from "@chorus/contracts";
import { createLogger } from "@chorus/logger";
import { Elysia, t } from "elysia";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";
import type { WsClientManager } from "../events/broadcaster";
import { getDiff, restore, track } from "../snapshot";
import { getRevertState } from "../snapshot/session-revert";
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
        const startTime = Date.now();
        try {
          logger.debug("Reverting session", { sessionID: params.sessionID });
          const result = await bridge.revertSession(params.sessionID);
          const duration = Date.now() - startTime;
          logger.info("Session reverted", {
            sessionID: params.sessionID,
            messageID: result?.messageID,
            messageIndex: result?.messageIndex,
            totalMessages: result?.totalMessages,
            durationMs: duration,
          });
          return {
            success: true,
            messageID: result?.messageID,
            messageIndex: result?.messageIndex,
            totalMessages: result?.totalMessages,
            timestamp: Date.now(),
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error("Failed to revert session", error, {
            sessionID: params.sessionID,
            errorMessage,
            durationMs: duration,
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
        const startTime = Date.now();
        try {
          logger.debug("Unreverting session", { sessionID: params.sessionID });
          await bridge.unrevertSession(params.sessionID);
          const duration = Date.now() - startTime;
          logger.info("Session unreverted", {
            sessionID: params.sessionID,
            durationMs: duration,
          });
          return { success: true, timestamp: Date.now() };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error("Failed to unrevert session", error, {
            sessionID: params.sessionID,
            errorMessage,
            durationMs: duration,
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
      "/snapshots/track",
      async ({ body }) => {
        try {
          const hash = await track(body.directory);
          return { hash, timestamp: Date.now() };
        } catch (error) {
          logger.error("Failed to track snapshot", error, {
            directory: body.directory,
          });
          throw error;
        }
      },
      {
        body: t.Object({
          directory: t.String(),
        }),
      }
    )

    .post(
      "/snapshots/restore",
      async ({ body }) => {
        try {
          await restore(body.directory, body.hash);
          return { success: true, timestamp: Date.now() };
        } catch (error) {
          logger.error("Failed to restore snapshot", error, {
            directory: body.directory,
            hash: body.hash,
          });
          throw error;
        }
      },
      {
        body: t.Object({
          directory: t.String(),
          hash: t.String(),
        }),
      }
    )

    .get(
      "/snapshots/diff",
      async ({ query }) => {
        try {
          const diff = await getDiff(query.directory, query.fromHash);
          return { diff, timestamp: Date.now() };
        } catch (error) {
          logger.error("Failed to get snapshot diff", error, {
            directory: query.directory,
            fromHash: query.fromHash,
          });
          throw error;
        }
      },
      {
        query: t.Object({
          directory: t.String(),
          fromHash: t.String(),
        }),
      }
    )

    .get(
      "/sessions/:sessionID/revert-state",
      ({ params }) => {
        const state = getRevertState(params.sessionID);
        return {
          hasRevertState: state != null,
          state: state ?? null,
          timestamp: Date.now(),
        };
      },
      {
        params: t.Object({
          sessionID: t.String(),
        }),
      }
    );
}
