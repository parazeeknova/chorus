"use client";

import type { AgentEvent, TaskRun } from "@chorus/spacetime";
import {
  getEventsByCard,
  getLatestRunForCard,
  getRunsByCard,
} from "@chorus/spacetime";
import { useEffect, useState } from "react";

export interface AgentHistoryEntry {
  cardId: string;
  events: AgentEvent[];
  latestRun: TaskRun | null;
  status: string;
  title: string;
}

export interface AgentEventStreamResult {
  error: string | null;
  events: AgentEvent[];
  history: AgentHistoryEntry[];
  loading: boolean;
  runs: TaskRun[];
}

export function useAgentEventStream(
  connection: unknown,
  cardId?: string
): AgentEventStreamResult {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    try {
      const conn = connection as {
        db: Record<
          string,
          {
            iter: () => Iterable<unknown>;
            onInsert: (cb: (ctx: unknown, row: unknown) => void) => void;
            onDelete: (cb: (ctx: unknown, row: unknown) => void) => void;
            onUpdate?: (
              cb: (ctx: unknown, oldRow: unknown, newRow: unknown) => void
            ) => void;
            removeOnInsert: (cb: (ctx: unknown, row: unknown) => void) => void;
            removeOnDelete: (cb: (ctx: unknown, row: unknown) => void) => void;
            removeOnUpdate?: (
              cb: (ctx: unknown, oldRow: unknown, newRow: unknown) => void
            ) => void;
          }
        >;
      };
      const db = conn.db;

      function syncTable<T>(
        tableName: string,
        setter: React.Dispatch<React.SetStateAction<T[]>>
      ): void {
        const table = db[tableName];
        if (!table) {
          return;
        }

        const initial = [...table.iter()] as T[];
        setter(initial);

        const onInsert = (_ctx: unknown, row: unknown) => {
          setter((prev: T[]) => [...prev, row as T]);
        };
        const onDelete = (_ctx: unknown, row: unknown) => {
          setter((prev: T[]) => prev.filter((r: T) => r !== row));
        };
        const onUpdate = (_ctx: unknown, oldRow: unknown, newRow: unknown) => {
          setter((prev: T[]) =>
            prev.map((r: T) => (r === oldRow ? (newRow as T) : r))
          );
        };

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        if (table.onUpdate) {
          table.onUpdate(onUpdate);
        }

        unsubscribers.push(() => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          if (table.removeOnUpdate) {
            table.removeOnUpdate(onUpdate);
          }
        });
      }

      syncTable<AgentEvent>("agent_event", setEvents);
      syncTable<TaskRun>("task_run", setRuns);

      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sync agent events"
      );
      setLoading(false);
    }

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [connection]);

  const filteredEvents = cardId
    ? events.filter((e) => e.cardId === cardId)
    : events;

  const runsByCard = getRunsByCard(runs);

  const history: AgentHistoryEntry[] = [];
  const cardIds = new Set(filteredEvents.map((e) => e.cardId));

  for (const cardId of cardIds) {
    const cardEvents = getEventsByCard(filteredEvents, cardId);
    const cardRuns = runsByCard.get(cardId) ?? [];
    const latestRun = getLatestRunForCard(cardRuns, cardId);

    history.push({
      cardId,
      events: cardEvents.sort((a, b) => Number(a.timestamp - b.timestamp)),
      latestRun,
      title: String(cardEvents[0]?.payload.title ?? cardId),
      status: latestRun?.status ?? "unknown",
    });
  }

  return {
    history,
    events: filteredEvents,
    runs,
    loading,
    error,
  };
}
