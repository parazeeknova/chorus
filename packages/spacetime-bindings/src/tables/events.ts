import type { EventType } from "../types/enums";

export interface AgentEvent {
  cardId: string;
  id: string;
  payload: Record<string, unknown>;
  runId: string;
  sessionId: string;
  timestamp: bigint;
  type: EventType;
}

export interface UiCommand {
  acknowledgedAt?: bigint;
  cardId?: string;
  commandType: "queue" | "approve" | "reject" | "abort" | "redirect" | "race";
  createdAt: bigint;
  error?: string;
  executedAt?: bigint;
  id: string;
  identityHex: string;
  payload: Record<string, unknown>;
  status: "pending" | "acknowledged" | "executed" | "failed";
}

export interface SystemEvent {
  id: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: bigint;
  type:
    | "bridge_started"
    | "bridge_stopped"
    | "session_created"
    | "session_closed"
    | "error";
}

export interface PresenceEvent {
  deviceSessionId: string;
  id: string;
  identityHex: string;
  selectedCardIds?: string[];
  timestamp: bigint;
  type: "join" | "leave" | "viewport_update" | "selection_update";
  viewport?: { x: number; y: number; zoom: number };
}
