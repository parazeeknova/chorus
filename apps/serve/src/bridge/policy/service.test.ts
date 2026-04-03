import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PolicyCheckRequest } from "@chorus/policy-engine";
import { PolicyService } from "./service";

const OUTPUT_DIR = join(process.cwd(), "tmp", "policy-test-outputs");

const LONG_TIMEOUT = 30_000;

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function saveJsonFile(filePath: string, data: unknown) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  → Saved: ${filePath}`);
}

beforeAll(() => {
  ensureDir(OUTPUT_DIR);
});

describe("ArmorIQ Real API Tests", () => {
  const policyService = new PolicyService();

  describe("checkPolicy", () => {
    test(
      "evaluates a task creation action",
      async () => {
        const request: PolicyCheckRequest = {
          cardId: "test-card-001",
          projectId: "test-project-001",
          action: {
            action: "task.create",
            target: "test-card-001",
          },
          scope: "task",
        };

        const result = await policyService.checkPolicy(request);

        expect(result.decision.decisionId).toBeDefined();
        expect(result.decision.decision).toBeDefined();
        expect(result.decision.reasonCode).toBeDefined();
        expect(result.decision.humanMessage).toBeDefined();
        expect(result.evaluationTimeMs).toBeGreaterThan(0);

        console.log(`  → Decision: ${result.decision.decision}`);
        console.log(`  → Reason: ${result.decision.reasonCode}`);
        console.log(`  → Message: ${result.decision.humanMessage}`);
        console.log(`  → Time: ${result.evaluationTimeMs}ms`);

        const outputPath = join(OUTPUT_DIR, "check-task-create.json");
        saveJsonFile(outputPath, {
          decision: result.decision.decision,
          reasonCode: result.decision.reasonCode,
          humanMessage: result.decision.humanMessage,
          evaluationTimeMs: result.evaluationTimeMs,
        });
      },
      { timeout: LONG_TIMEOUT }
    );

    test(
      "evaluates a tool execution action",
      async () => {
        const request: PolicyCheckRequest = {
          cardId: "test-card-002",
          projectId: "test-project-001",
          action: {
            action: "tool.execute",
            target: "bash",
            parameters: { command: "echo hello" },
          },
          scope: "tool",
        };

        const result = await policyService.checkPolicy(request);

        expect(result.decision.decisionId).toBeDefined();
        expect(result.decision.decision).toBeDefined();

        console.log(`  → Tool action decision: ${result.decision.decision}`);
        console.log(`  → Reason: ${result.decision.reasonCode}`);

        const outputPath = join(OUTPUT_DIR, "check-tool-execute.json");
        saveJsonFile(outputPath, {
          decision: result.decision.decision,
          reasonCode: result.decision.reasonCode,
          humanMessage: result.decision.humanMessage,
          evaluationTimeMs: result.evaluationTimeMs,
        });
      },
      { timeout: LONG_TIMEOUT }
    );
  });

  describe("preflightCheck", () => {
    test(
      "runs preflight policy check",
      async () => {
        const result = await policyService.preflightCheck(
          "test-card-preflight",
          "test-project-001"
        );

        expect(result.decision.decisionId).toBeDefined();
        expect(result.decision.decision).toBeDefined();

        console.log(`  → Preflight decision: ${result.decision.decision}`);
        console.log(`  → Reason: ${result.decision.reasonCode}`);

        const outputPath = join(OUTPUT_DIR, "preflight-check.json");
        saveJsonFile(outputPath, {
          decision: result.decision.decision,
          reasonCode: result.decision.reasonCode,
          humanMessage: result.decision.humanMessage,
          evaluationTimeMs: result.evaluationTimeMs,
        });
      },
      { timeout: LONG_TIMEOUT }
    );
  });

  describe("checkToolAction", () => {
    test(
      "checks file read tool action",
      async () => {
        const result = await policyService.checkToolAction(
          "test-card-003",
          "test-project-001",
          "read_file",
          { path: "/tmp/test.txt" }
        );

        expect(result.decision.decisionId).toBeDefined();
        expect(result.decision.decision).toBeDefined();

        console.log(`  → read_file decision: ${result.decision.decision}`);
        console.log(`  → Reason: ${result.decision.reasonCode}`);

        const outputPath = join(OUTPUT_DIR, "check-read-file.json");
        saveJsonFile(outputPath, {
          decision: result.decision.decision,
          reasonCode: result.decision.reasonCode,
          humanMessage: result.decision.humanMessage,
          evaluationTimeMs: result.evaluationTimeMs,
        });
      },
      { timeout: LONG_TIMEOUT }
    );

    test(
      "checks bash tool action",
      async () => {
        const result = await policyService.checkToolAction(
          "test-card-004",
          "test-project-001",
          "bash",
          { command: "ls -la" }
        );

        expect(result.decision.decisionId).toBeDefined();
        expect(result.decision.decision).toBeDefined();

        console.log(`  → bash decision: ${result.decision.decision}`);
        console.log(`  → Reason: ${result.decision.reasonCode}`);

        const outputPath = join(OUTPUT_DIR, "check-bash.json");
        saveJsonFile(outputPath, {
          decision: result.decision.decision,
          reasonCode: result.decision.reasonCode,
          humanMessage: result.decision.humanMessage,
          evaluationTimeMs: result.evaluationTimeMs,
        });
      },
      { timeout: LONG_TIMEOUT }
    );
  });

  describe("getPolicyProfile", () => {
    test("returns policy profile for a card", async () => {
      const profile = await policyService.getPolicyProfile(
        "test-card-profile",
        "test-project-001"
      );

      expect(profile.profileId).toBeDefined();
      expect(profile.cardId).toBe("test-card-profile");
      expect(profile.projectId).toBe("test-project-001");

      console.log(`  → Profile ID: ${profile.profileId}`);

      const outputPath = join(OUTPUT_DIR, "policy-profile.json");
      saveJsonFile(outputPath, {
        profileId: profile.profileId,
        cardId: profile.cardId,
        projectId: profile.projectId,
      });
    });
  });
});
