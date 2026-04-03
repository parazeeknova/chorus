import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import type { ServerWebSocket } from "bun";
import type { WsContext } from "../ws/types";

export interface WsClientManager {
  broadcast: (event: NormalizedAgentEvent) => void;
  clients: Set<ServerWebSocket<WsContext>>;
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

  return { clients, broadcast };
}
