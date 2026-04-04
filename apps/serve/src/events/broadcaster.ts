import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import type { ServerWebSocket } from "bun";
import type { WsContext } from "../ws/types";

export interface WsClientManager {
  broadcast: (event: NormalizedAgentEvent) => void;
  broadcastRaw: (message: string) => void;
  clients: Set<ServerWebSocket<WsContext>>;
  close: () => void;
}

export function createWsClientManager(): WsClientManager {
  const clients = new Set<ServerWebSocket<WsContext>>();

  function broadcast(event: NormalizedAgentEvent): void {
    const message = JSON.stringify({
      type: `agent.${event.activity ?? event.type}`,
      payload: event,
      timestamp: Date.now(),
    });

    for (const ws of clients) {
      ws.send(message);
    }
  }

  function broadcastRaw(message: string): void {
    for (const ws of clients) {
      ws.send(message);
    }
  }

  function close(): void {
    for (const ws of clients) {
      ws.close();
    }
    clients.clear();
  }

  return { clients, broadcast, broadcastRaw, close };
}
