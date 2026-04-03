import { Elysia, t } from "elysia";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";

export function createHttpRoutes(bridge: OpenCodeBridge) {
  return new Elysia()
    .get("/health", () => ({
      status: "ok",
      timestamp: Date.now(),
    }))

    .get("/bridge/status", () => bridge.getStatus())

    .post(
      "/tasks",
      async ({ body }) => {
        const session = await bridge.createSession({
          title: body.text.slice(0, 80),
        });

        await bridge.promptSession({
          sessionID: session.id,
          text: body.text,
          model: body.model,
          agent: body.agent,
        });

        return {
          sessionID: session.id,
          accepted: true,
          timestamp: Date.now(),
        };
      },
      {
        body: t.Object({
          text: t.String(),
          model: t.Optional(
            t.Object({
              providerID: t.String(),
              modelID: t.String(),
            })
          ),
          agent: t.Optional(t.String()),
        }),
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
    );
}
