export interface Position {
  x: number;
  y: number;
}

export interface Workspace {
  createdAt: bigint;
  id: string;
  name: string;
  updatedAt: bigint;
}

export interface Project {
  createdAt: bigint;
  defaultPolicyId?: string;
  id: string;
  name: string;
  repositoryPath?: string;
  updatedAt: bigint;
  workspaceId: string;
}

export interface Board {
  createdAt: bigint;
  id: string;
  name: string;
  position: Position;
  projectId: string;
  updatedAt: bigint;
}

export interface Lane {
  boardId: string;
  id: string;
  order: number;
  status: string;
}

export interface DeviceSession {
  connected: boolean;
  deviceType: "desktop" | "mobile" | "tablet";
  id: string;
  identityHex: string;
  lastActiveAt: bigint;
}

export interface UserPreferences {
  audioDevice: "desktop" | "mobile" | "all";
  audioEnabled: boolean;
  audioMode: "all" | "approvals_only" | "failures_only";
  identityHex: string;
  notificationsEnabled: boolean;
  theme: "light" | "dark" | "system";
}

export type {
  ActivityState,
  ApprovalResolution,
  CardStatus,
  DeviceType,
  EventType,
  PolicyDecision,
  RedirectMode,
  WorkflowStatus,
} from "../types/enums";
