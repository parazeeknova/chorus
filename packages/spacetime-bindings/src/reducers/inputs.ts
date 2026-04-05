import type { CardStatus, RedirectMode } from "../types/enums";

export interface CreateProjectInput {
  defaultPolicyId?: string;
  name: string;
  repositoryPath?: string;
  workspaceId: string;
}

export interface CreateProjectResult {
  projectId: string;
}

export interface CreateBoardInput {
  name: string;
  position: { x: number; y: number };
  projectId: string;
}

export interface CreateBoardResult {
  boardId: string;
}

export interface CreateCardInput {
  boardId: string;
  modelConfig?: string;
  policyProfileId?: string;
  prompt: string;
  raceGroupId?: string;
  title: string;
}

export interface CreateCardResult {
  cardId: string;
}

export interface QueueCardInput {
  cardId: string;
}

export interface AttachAgentSessionInput {
  cardId: string;
  provider: "opencode";
  providerSessionId: string;
  runId: string;
}

export interface RecordAgentEventInput {
  cardId: string;
  payload: Record<string, unknown>;
  runId: string;
  sessionId: string;
  type: string;
}

export interface RecordPolicyDecisionInput {
  cardId: string;
  decision: "allowed" | "blocked" | "override_requested" | "override_granted";
  humanMessage: string;
  reasonCode: string;
  requestedAction: string;
  taskScope: string;
}

export interface RequestApprovalInput {
  cardId: string;
  message: string;
  permissionId?: string;
  runId: string;
}

export interface RequestApprovalResult {
  approvalId: string;
}

export interface ResolveApprovalInput {
  approvalId: string;
  resolution: "approved" | "rejected" | "aborted";
  resolutionNote?: string;
}

export interface CompleteCardInput {
  cardId: string;
  runId: string;
}

export interface FailCardInput {
  cardId: string;
  error: string;
  runId: string;
}

export interface AbortCardInput {
  cardId: string;
  reason?: string;
  runId: string;
}

export interface RedirectCardInput {
  cardId: string;
  mode: RedirectMode;
  redirectPrompt: string;
  runId: string;
}

export interface LinkDependencyInput {
  condition: "success" | "failure" | "always";
  downstreamCardId: string;
  upstreamCardId: string;
}

export interface LinkDependencyResult {
  dependencyId: string;
}

export interface TriggerDownstreamCardsInput {
  completedCardId: string;
  status: CardStatus;
}

export interface EnqueueVoiceNotificationInput {
  cardId?: string;
  eventType: string;
  message: string;
}

export interface AcknowledgeUiCommandInput {
  commandId: string;
  error?: string;
  status: "acknowledged" | "executed" | "failed";
}

export interface RecordAgentOutputInput {
  chunk: string;
  outputType: "log" | "error" | "result";
  taskId: string;
}

export interface SendMobilePromptInput {
  taskId: string;
  text: string;
}

export interface ConsumeMobilePromptInput {
  promptId: string;
}
