export interface Position {
  x: number;
  y: number;
}

export type Timestamp = bigint;

export type EntityId<T extends string> = string & { readonly _brand: T };

export type ProjectId = EntityId<"ProjectId">;
export type BoardId = EntityId<"BoardId">;
export type CardId = EntityId<"CardId">;
export type RunId = EntityId<"RunId">;
export type SessionId = EntityId<"SessionId">;
export type DependencyId = EntityId<"DependencyId">;
export type WorkflowRunId = EntityId<"WorkflowRunId">;
export type ApprovalId = EntityId<"ApprovalId">;
export type PolicyDecisionId = EntityId<"PolicyDecisionId">;
export type CommandId = EntityId<"CommandId">;
export type RaceGroupId = EntityId<"RaceGroupId">;
export type WorkspaceId = EntityId<"WorkspaceId">;
export type DeviceSessionId = EntityId<"DeviceSessionId">;
export type EventId = EntityId<"EventId">;

export function asProjectId(value: string): ProjectId {
  return value as ProjectId;
}

export function asBoardId(value: string): BoardId {
  return value as BoardId;
}

export function asCardId(value: string): CardId {
  return value as CardId;
}

export function asRunId(value: string): RunId {
  return value as RunId;
}

export function asSessionId(value: string): SessionId {
  return value as SessionId;
}

export function asDependencyId(value: string): DependencyId {
  return value as DependencyId;
}

export function asWorkflowRunId(value: string): WorkflowRunId {
  return value as WorkflowRunId;
}

export function asApprovalId(value: string): ApprovalId {
  return value as ApprovalId;
}

export function asPolicyDecisionId(value: string): PolicyDecisionId {
  return value as PolicyDecisionId;
}

export function asCommandId(value: string): CommandId {
  return value as CommandId;
}

export function asRaceGroupId(value: string): RaceGroupId {
  return value as RaceGroupId;
}

export function asWorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId;
}

export function asDeviceSessionId(value: string): DeviceSessionId {
  return value as DeviceSessionId;
}

export function asEventId(value: string): EventId {
  return value as EventId;
}
