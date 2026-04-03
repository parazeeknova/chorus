import { PolicyCheckRequestSchema } from "@chorus/policy-engine";
import { Elysia, t } from "elysia";
import { PolicyService } from "../bridge/policy";

const policyService = new PolicyService();

export const policyRoutes = new Elysia({ prefix: "/policy" })
  .post(
    "/check",
    async ({ body }) => {
      const result = await policyService.checkPolicy(body);

      return {
        decision: result.decision.decision,
        decisionId: result.decision.decisionId,
        reasonCode: result.decision.reasonCode,
        humanMessage: result.decision.humanMessage,
        overrideable: result.decision.overrideable,
        evaluationTimeMs: result.evaluationTimeMs,
        timestamp: result.evaluatedAt.toISOString(),
      };
    },
    {
      body: PolicyCheckRequestSchema,
    }
  )
  .post(
    "/preflight",
    async ({ body }) => {
      const { cardId, projectId } = body;
      const result = await policyService.preflightCheck(cardId, projectId);

      return {
        decision: result.decision.decision,
        decisionId: result.decision.decisionId,
        reasonCode: result.decision.reasonCode,
        humanMessage: result.decision.humanMessage,
        evaluationTimeMs: result.evaluationTimeMs,
        timestamp: result.evaluatedAt.toISOString(),
      };
    },
    {
      body: t.Object({
        cardId: t.String(),
        projectId: t.String(),
      }),
    }
  )
  .post(
    "/tool-check",
    async ({ body }) => {
      const { cardId, projectId, toolName, toolArgs } = body;
      const result = await policyService.checkToolAction(
        cardId,
        projectId,
        toolName,
        toolArgs
      );

      return {
        decision: result.decision.decision,
        decisionId: result.decision.decisionId,
        reasonCode: result.decision.reasonCode,
        humanMessage: result.decision.humanMessage,
        overrideable: result.decision.overrideable,
        evaluationTimeMs: result.evaluationTimeMs,
        timestamp: result.evaluatedAt.toISOString(),
      };
    },
    {
      body: t.Object({
        cardId: t.String(),
        projectId: t.String(),
        toolName: t.String(),
        toolArgs: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    }
  )
  .get(
    "/profile",
    async ({ query }) => {
      const { cardId, projectId } = query;
      const profile = await policyService.getPolicyProfile(cardId, projectId);

      return {
        profileId: profile.profileId,
        cardId: profile.cardId,
        projectId: profile.projectId,
        templateCount: profile.templates?.length ?? 0,
        customRuleCount: profile.customRules?.length ?? 0,
      };
    },
    {
      query: t.Object({
        cardId: t.String(),
        projectId: t.String(),
      }),
    }
  )
  .get("/health", () => ({
    status: "ok",
    service: "policy",
    timestamp: new Date().toISOString(),
  }));
