import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import type { ServerWebSocket } from "bun";

export interface WsSession {
  id: string;
  ws: ServerWebSocket<WsContext>;
}

export interface WsContext {
  sessionId: string;
  subscriptions: Set<string>;
}

export type WsMessage =
  | { type: "task.queue"; payload: QueueTaskPayload }
  | { type: "task.approve"; payload: ApprovePayload }
  | { type: "task.reject"; payload: RejectPayload }
  | { type: "task.abort"; payload: AbortPayload }
  | { type: "task.redirect"; payload: RedirectPayload }
  | { type: "task.race"; payload: RacePayload }
  | { type: "viewport.sync"; payload: ViewportSyncPayload }
  | { type: "presence.ping" };

export interface QueueTaskPayload {
  agent?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  sessionID: string;
  text: string;
}

export interface ApprovePayload {
  message?: string;
  requestID: string;
  sessionID: string;
}

export interface RejectPayload {
  message?: string;
  requestID: string;
  sessionID: string;
}

export interface AbortPayload {
  sessionID: string;
}

export interface RedirectPayload {
  mode: "soft" | "hard";
  sessionID: string;
  text: string;
}

export interface RacePayload {
  baseTitle?: string;
  models: Array<{ providerID: string; modelID: string }>;
  parentSessionID: string;
  text: string;
}

export interface ViewportSyncPayload {
  projectId: string;
  viewport: { x: number; y: number; zoom: number };
}

export interface WsResponse<T = unknown> {
  payload: T;
  timestamp: number;
  type: string;
}

export function broadcast(
  clients: Set<ServerWebSocket<WsContext>>,
  event: NormalizedAgentEvent
): void {
  const message = JSON.stringify({
    type: `agent.${event.activity ?? event.type}`,
    payload: event,
    timestamp: Date.now(),
  } satisfies WsResponse<NormalizedAgentEvent>);

  for (const ws of clients) {
    ws.send(message);
  }
}

export function sendResponse<T>(
  ws: ServerWebSocket<WsContext>,
  type: string,
  payload: T
): void {
  ws.send(
    JSON.stringify({
      type,
      payload,
      timestamp: Date.now(),
    } satisfies WsResponse<T>)
  );
}
