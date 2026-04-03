import { z } from "zod";

export const PolicyDecisionEnum = z.enum(["allowed", "blocked"]);

export type PolicyDecisionValue = z.infer<typeof PolicyDecisionEnum>;

export const PolicyScopeEnum = z.enum(["project", "task", "tool"]);

export type PolicyScope = z.infer<typeof PolicyScopeEnum>;

export const PolicyActionSchema = z.object({
  action: z.string(),
  target: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export type PolicyAction = z.infer<typeof PolicyActionSchema>;

export const PolicyDecisionSchema = z.object({
  decisionId: z.string(),
  decision: PolicyDecisionEnum,
  reasonCode: z.string(),
  humanMessage: z.string(),
  taskScope: z.string().optional(),
  requestedAction: PolicyActionSchema,
  timestamp: z.date(),
  overrideable: z.boolean().optional().default(false),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const PolicyCheckRequestSchema = z.object({
  cardId: z.string(),
  projectId: z.string(),
  sessionId: z.string().optional(),
  action: PolicyActionSchema,
  scope: PolicyScopeEnum.optional(),
});

export type PolicyCheckRequest = z.infer<typeof PolicyCheckRequestSchema>;

export const PolicyCheckResultSchema = z.object({
  decision: PolicyDecisionSchema,
  evaluatedAt: z.date(),
  evaluationTimeMs: z.number(),
});

export type PolicyCheckResult = z.infer<typeof PolicyCheckResultSchema>;

export const PolicyTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: PolicyScopeEnum,
  rules: z.array(
    z.object({
      action: z.string(),
      decision: PolicyDecisionEnum,
      reason: z.string(),
    })
  ),
});

export type PolicyTemplate = z.infer<typeof PolicyTemplateSchema>;

export const PolicyProfileSchema = z.object({
  profileId: z.string(),
  cardId: z.string(),
  projectId: z.string(),
  templates: z.array(PolicyTemplateSchema).optional(),
  customRules: z
    .array(
      z.object({
        action: z.string(),
        decision: PolicyDecisionEnum,
        reason: z.string(),
      })
    )
    .optional(),
});

export type PolicyProfile = z.infer<typeof PolicyProfileSchema>;
