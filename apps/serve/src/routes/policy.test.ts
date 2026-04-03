import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type {
  PolicyCheckRequest,
  PolicyCheckResult,
} from "@chorus/policy-engine";
import { PolicyCheckRequestSchema } from "@chorus/policy-engine";
import { Elysia, t } from "elysia";

function mockPolicyCheck(_request: PolicyCheckRequest): PolicyCheckResult {
  const isAllowed = _request.action.action !== "tool.dangerous";

  return {
    decision: {
      decisionId: "mock-decision-id",
      decision: isAllowed ? "allowed" : "blocked",
      reasonCode: isAllowed ? "policy_match" : "policy_violation",
      humanMessage: isAllowed
        ? "Action is allowed by policy."
        : "Action blocked by policy.",
      taskScope: _request.scope,
      requestedAction: _request.action,
      timestamp: new Date(),
      overrideable: !isAllowed,
    },
    evaluatedAt: new Date(),
    evaluationTimeMs: 42,
  };
}

const testApp = new Elysia({ prefix: "/policy" })
  .post(
    "/check",
    ({ body }) => {
      const result = mockPolicyCheck(body);
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
    ({ body }) => {
      const { cardId, projectId } = body;
      const result = mockPolicyCheck({
        cardId,
        projectId,
        action: { action: "task.create", target: cardId },
        scope: "task",
      });
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
    ({ body }) => {
      const { cardId, projectId, toolName, toolArgs } = body;
      const result = mockPolicyCheck({
        cardId,
        projectId,
        action: {
          action: `tool.${toolName}`,
          target: toolName,
          parameters: toolArgs,
        },
        scope: "tool",
      });
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
    ({ query }) => {
      const { cardId, projectId } = query;
      return {
        profileId: `${projectId}-${cardId}`,
        cardId,
        projectId,
        templateCount: 0,
        customRuleCount: 0,
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

describe("policy routes integration", () => {
  let app: ReturnType<typeof createTestApp>;

  function createTestApp() {
    return new Elysia().use(testApp).listen(0);
  }

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(() => {
    app.stop();
  });

  describe("GET /policy/health", () => {
    test("returns health status", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/health`
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.service).toBe("policy");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("POST /policy/check", () => {
    test("allows a safe action", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: "card-123",
            projectId: "proj-456",
            action: { action: "task.create" },
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe("allowed");
      expect(body.decisionId).toBe("mock-decision-id");
      expect(body.humanMessage).toBe("Action is allowed by policy.");
    });

    test("blocks a dangerous tool action", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: "card-123",
            projectId: "proj-456",
            action: { action: "tool.dangerous" },
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe("blocked");
      expect(body.overrideable).toBe(true);
    });

    test("rejects invalid request", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "proj-456",
            action: { action: "task.create" },
          }),
        }
      );
      expect(res.status).toBe(422);
    });
  });

  describe("POST /policy/preflight", () => {
    test("runs preflight check for task creation", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/preflight`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: "card-123",
            projectId: "proj-456",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe("allowed");
      expect(body.evaluationTimeMs).toBe(42);
    });
  });

  describe("POST /policy/tool-check", () => {
    test("checks tool action with args", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/tool-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: "card-123",
            projectId: "proj-456",
            toolName: "bash",
            toolArgs: { command: "ls -la" },
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe("allowed");
    });

    test("checks tool action without args", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/tool-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: "card-123",
            projectId: "proj-456",
            toolName: "read_file",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe("allowed");
    });
  });

  describe("GET /policy/profile", () => {
    test("returns policy profile", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/policy/profile?cardId=card-123&projectId=proj-456`
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.profileId).toBe("proj-456-card-123");
      expect(body.cardId).toBe("card-123");
      expect(body.projectId).toBe("proj-456");
    });
  });
});
