import type { ActivityState, CardStatus } from "../types/enums";

export interface TaskCard {
  activity: ActivityState;
  boardId: string;
  createdAt: bigint;
  id: string;
  laneId: string;
  modelConfig?: string;
  policyProfileId?: string;
  position: { x: number; y: number };
  prompt: string;
  raceGroupId?: string;
  status: CardStatus;
  title: string;
  updatedAt: bigint;
}

export interface TaskRun {
  cardId: string;
  endedAt?: bigint;
  id: string;
  latestEventSummary?: string;
  outputPreview?: string;
  redirectCount: number;
  sessionId: string;
  startedAt: bigint;
  status:
    | "starting"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "aborted";
}

export interface AgentSession {
  createdAt: bigint;
  id: string;
  provider: "opencode";
  providerSessionId: string;
  runId: string;
  status: "active" | "idle" | "error" | "closed";
}

export interface TaskDependency {
  condition: "success" | "failure" | "always";
  createdAt: bigint;
  downstreamCardId: string;
  id: string;
  upstreamCardId: string;
}

export interface RaceGroup {
  completedAt?: bigint;
  createdAt: bigint;
  id: string;
  parentCardId?: string;
  winnerCardId?: string;
}

export interface ApprovalRequest {
  cardId: string;
  id: string;
  message: string;
  permissionId?: string;
  requestedAt: bigint;
  resolutionNote?: string;
  resolvedAt?: bigint;
  resolvedBy?: string;
  runId: string;
  status: "pending" | "approved" | "rejected" | "expired";
}

export interface PolicyDecisionRecord {
  cardId: string;
  decision: "allowed" | "blocked" | "override_requested" | "override_granted";
  humanMessage: string;
  id: string;
  reasonCode: string;
  requestedAction: string;
  taskScope: string;
  timestamp: bigint;
}

export interface WorkflowRunRecord {
  endedAt?: bigint;
  error?: string;
  id: string;
  startedAt: bigint;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  triggerCardId: string;
  workflowDefinitionId: string;
}

export interface AudioNotification {
  audioUrl?: string;
  cardId?: string;
  createdAt: bigint;
  eventType: string;
  id: string;
  message: string;
  playedAt?: bigint;
  status: "pending" | "generated" | "played" | "failed";
}
