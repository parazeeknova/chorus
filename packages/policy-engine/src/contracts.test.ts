import { describe, expect, test } from "bun:test";
import {
  PolicyActionSchema,
  PolicyCheckRequestSchema,
  PolicyDecisionEnum,
  PolicyDecisionSchema,
  PolicyProfileSchema,
  PolicyScopeEnum,
  PolicyTemplateSchema,
} from "./contracts";

describe("policy contracts", () => {
  describe("PolicyDecisionEnum", () => {
    test("accepts allowed", () => {
      const result = PolicyDecisionEnum.safeParse("allowed");
      expect(result.success).toBe(true);
    });

    test("accepts blocked", () => {
      const result = PolicyDecisionEnum.safeParse("blocked");
      expect(result.success).toBe(true);
    });

    test("rejects invalid decision", () => {
      const result = PolicyDecisionEnum.safeParse("denied");
      expect(result.success).toBe(false);
    });
  });

  describe("PolicyScopeEnum", () => {
    test("accepts project, task, tool", () => {
      expect(PolicyScopeEnum.safeParse("project").success).toBe(true);
      expect(PolicyScopeEnum.safeParse("task").success).toBe(true);
      expect(PolicyScopeEnum.safeParse("tool").success).toBe(true);
    });

    test("rejects invalid scope", () => {
      const result = PolicyScopeEnum.safeParse("global");
      expect(result.success).toBe(false);
    });
  });

  describe("PolicyActionSchema", () => {
    test("validates minimal action", () => {
      const result = PolicyActionSchema.safeParse({ action: "task.create" });
      expect(result.success).toBe(true);
    });

    test("validates full action", () => {
      const result = PolicyActionSchema.safeParse({
        action: "tool.execute",
        target: "bash",
        parameters: { command: "ls" },
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing action", () => {
      const result = PolicyActionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("PolicyDecisionSchema", () => {
    test("validates a complete decision", () => {
      const result = PolicyDecisionSchema.safeParse({
        decisionId: "dec-123",
        decision: "allowed",
        reasonCode: "policy_match",
        humanMessage: "Action is allowed.",
        taskScope: "task",
        requestedAction: { action: "task.create" },
        timestamp: new Date(),
        overrideable: true,
      });
      expect(result.success).toBe(true);
    });

    test("validates minimal decision", () => {
      const result = PolicyDecisionSchema.safeParse({
        decisionId: "dec-123",
        decision: "blocked",
        reasonCode: "policy_violation",
        humanMessage: "Action blocked.",
        requestedAction: { action: "tool.bash" },
        timestamp: new Date(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("PolicyCheckRequestSchema", () => {
    test("validates a complete request", () => {
      const result = PolicyCheckRequestSchema.safeParse({
        cardId: "card-123",
        projectId: "proj-456",
        sessionId: "session-789",
        action: { action: "tool.execute", target: "bash" },
        scope: "tool",
      });
      expect(result.success).toBe(true);
    });

    test("validates minimal request", () => {
      const result = PolicyCheckRequestSchema.safeParse({
        cardId: "card-123",
        projectId: "proj-456",
        action: { action: "task.create" },
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing cardId", () => {
      const result = PolicyCheckRequestSchema.safeParse({
        projectId: "proj-456",
        action: { action: "task.create" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PolicyTemplateSchema", () => {
    test("validates a template", () => {
      const result = PolicyTemplateSchema.safeParse({
        id: "tpl-123",
        name: "No Bash",
        scope: "tool",
        rules: [
          {
            action: "tool.bash",
            decision: "blocked",
            reason: "Shell access disabled",
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("PolicyProfileSchema", () => {
    test("validates a profile", () => {
      const result = PolicyProfileSchema.safeParse({
        profileId: "profile-123",
        cardId: "card-123",
        projectId: "proj-456",
        customRules: [],
      });
      expect(result.success).toBe(true);
    });
  });
});
