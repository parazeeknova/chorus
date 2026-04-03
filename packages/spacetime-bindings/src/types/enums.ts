export type CardStatus =
  | "queue"
  | "in_progress"
  | "approve"
  | "done"
  | "failed"
  | "aborted";

export type ActivityState =
  | "idle"
  | "thinking"
  | "writing"
  | "waiting_for_approval"
  | "error";

export type PolicyDecision =
  | "allowed"
  | "blocked"
  | "override_requested"
  | "override_granted";

export type ApprovalResolution =
  | "approved"
  | "rejected"
  | "aborted"
  | "redirected";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type DeviceType = "desktop" | "mobile" | "tablet";

export type EventType =
  | "card.created"
  | "card.queued"
  | "card.started"
  | "card.moved"
  | "card.waiting_for_approval"
  | "card.approved"
  | "card.rejected"
  | "card.redirected"
  | "card.aborted"
  | "card.completed"
  | "card.failed"
  | "stream.delta"
  | "stream.phase.changed"
  | "stream.activity.changed"
  | "stream.tool.started"
  | "stream.tool.completed"
  | "policy.allowed"
  | "policy.blocked"
  | "policy.override_requested"
  | "policy.override_granted"
  | "workflow.linked"
  | "workflow.triggered"
  | "workflow.branch.taken"
  | "workflow.retry.scheduled"
  | "voice.enqueued"
  | "voice.generated"
  | "voice.played"
  | "voice.failed";

export type RedirectMode = "soft_redirect" | "hard_redirect";
