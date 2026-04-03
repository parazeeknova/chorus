import type {
  IntentToken,
  MCPInvocationResult,
  PlanCapture,
} from "@armoriq/sdk";
import { ArmorIQClient } from "@armoriq/sdk";
import type {
  PolicyCheckRequest,
  PolicyCheckResult,
  PolicyDecision,
  PolicyProfile,
} from "@chorus/policy-engine";
import { env } from "../../config/env";

export class PolicyService {
  private readonly client: ArmorIQClient;

  constructor() {
    this.client = new ArmorIQClient({
      apiKey: env.ARMORIQ_API_KEY,
      userId: env.ARMORIQ_USER_ID,
      agentId: env.ARMORIQ_AGENT_ID,
      proxyEndpoint: env.ARMORIQ_PROXY_ENDPOINT,
      timeout: env.ARMORIQ_TIMEOUT,
      maxRetries: env.ARMORIQ_MAX_RETRIES,
    });
  }

  capturePlan(
    llm: string,
    prompt: string,
    plan?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): PlanCapture {
    return this.client.capturePlan(llm, prompt, plan, metadata);
  }

  getIntentToken(
    planCapture: PlanCapture,
    policy?: Record<string, unknown>,
    validitySeconds?: number
  ): Promise<IntentToken> {
    return this.client.getIntentToken(planCapture, policy, validitySeconds);
  }

  invoke(
    mcp: string,
    action: string,
    intentToken: IntentToken,
    params?: Record<string, unknown>,
    userEmail?: string
  ): Promise<MCPInvocationResult> {
    return this.client.invoke(
      mcp,
      action,
      intentToken,
      params,
      undefined,
      userEmail
    );
  }

  async checkPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    const startTime = Date.now();

    try {
      const plan = this.capturePlan(
        "chorus-agent",
        `Action: ${request.action.action} on ${request.action.target ?? "unknown"}`,
        {
          steps: [
            {
              action: request.action.action,
              target: request.action.target,
              parameters: request.action.parameters,
            },
          ],
        },
        {
          cardId: request.cardId,
          projectId: request.projectId,
          sessionId: request.sessionId,
          scope: request.scope,
        }
      );

      const intentToken = await this.getIntentToken(plan);

      const result = await this.client.invoke(
        "chorus-mcp",
        request.action.action,
        intentToken,
        request.action.parameters
      );

      const decision: PolicyDecision = {
        decisionId: intentToken.tokenId,
        decision: result.verified ? "allowed" : "blocked",
        reasonCode: result.status,
        humanMessage: result.verified
          ? "Action verified and allowed by policy."
          : "Action blocked by policy verification.",
        taskScope: request.scope,
        requestedAction: request.action,
        timestamp: new Date(),
        overrideable: false,
      };

      return {
        decision,
        evaluatedAt: new Date(),
        evaluationTimeMs: Date.now() - startTime,
      };
    } catch (_error) {
      const decision: PolicyDecision = {
        decisionId: crypto.randomUUID(),
        decision: "blocked",
        reasonCode: "policy_service_error",
        humanMessage: "Policy check failed. Action blocked for safety.",
        taskScope: request.scope,
        requestedAction: request.action,
        timestamp: new Date(),
        overrideable: false,
      };

      return {
        decision,
        evaluatedAt: new Date(),
        evaluationTimeMs: Date.now() - startTime,
      };
    }
  }

  preflightCheck(
    cardId: string,
    projectId: string
  ): Promise<PolicyCheckResult> {
    return this.checkPolicy({
      cardId,
      projectId,
      action: {
        action: "task.create",
        target: cardId,
      },
      scope: "task",
    });
  }

  checkToolAction(
    cardId: string,
    projectId: string,
    toolName: string,
    toolArgs?: Record<string, unknown>
  ): Promise<PolicyCheckResult> {
    return this.checkPolicy({
      cardId,
      projectId,
      action: {
        action: "tool.execute",
        target: toolName,
        parameters: toolArgs,
      },
      scope: "tool",
    });
  }

  getPolicyProfile(cardId: string, projectId: string): PolicyProfile {
    return {
      profileId: `${projectId}-${cardId}`,
      cardId,
      projectId,
      customRules: [],
    };
  }

  listMcps(): Promise<Array<{ mcpId: string; name: string; url: string }>> {
    return this.client.listMcps();
  }

  completePlan(planId: string): Promise<void> {
    return this.client.completePlan(planId);
  }

  updatePlanStatus(planId: string, status: string): Promise<void> {
    return this.client.updatePlanStatus(planId, status);
  }
}
