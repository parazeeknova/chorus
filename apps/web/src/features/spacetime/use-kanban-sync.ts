"use client";

import type {
  AgentEvent,
  Lane,
  TaskCard,
  TaskDependency,
  TaskRun,
} from "@chorus/spacetime";
import {
  getLatestRunForCard,
  getRunsByCard,
  sortCardsBy,
} from "@chorus/spacetime";
import { useEffect, useState } from "react";
import type {
  AgentStepKind,
  AgentStepStatus,
} from "@/features/kanban/components/agent-output-card";
import type { Columns, Task } from "@/features/kanban/components/kanban";

function buildKanbanColumns(
  cards: TaskCard[],
  runs: TaskRun[],
  _dependencies: TaskDependency[],
  events: AgentEvent[],
  _lanes: Lane[]
): Columns {
  const columns: Columns = {
    queue: [],
    in_progress: [],
    approve: [],
    done: [],
  };

  const sorted = sortCardsBy(cards, "createdAt");
  const runsByCard = getRunsByCard(runs);

  for (const card of sorted) {
    const cardRuns = runsByCard.get(card.id) ?? [];
    const latestRun = getLatestRunForCard(cardRuns, card.id);
    const cardEvents = events.filter((e) => e.cardId === card.id);

    const task = mapCardToTask(card, latestRun ?? null, cardEvents);

    if (card.status === "queue") {
      columns.queue.push(task);
    } else if (card.status === "in_progress") {
      columns.in_progress.push(task);
    } else if (card.status === "approve") {
      columns.approve.push(task);
    } else if (card.status === "done") {
      columns.done.push(task);
    }
  }

  return columns;
}

function mapCardToTask(
  card: TaskCard,
  run: TaskRun | null,
  events: AgentEvent[]
): Task {
  const task: Task = {
    id: card.id,
    title: card.title,
    label: card.boardId,
    labelVariant: "info-light",
  };

  if (run) {
    task.runId = run.sessionId;
    task.run = {
      elapsed: formatElapsed(run),
      model: "SpaceTimeDB",
      sessionId: run.sessionId,
      startedAt: Number(run.startedAt),
      steps: events.map((ev) => ({
        id: ev.id,
        kind: inferStepKind(ev.type) as AgentStepKind,
        status: inferStepStatus(ev.type) as AgentStepStatus,
        summary: String(ev.payload.summary ?? ev.type),
        content: String(ev.payload.content ?? ""),
      })),
      taskTitle: card.title,
    };
  }

  return task;
}

function formatElapsed(run: TaskRun): string {
  const startedAt = Number(run.startedAt);
  const endedAt = run.endedAt ? Number(run.endedAt) : Date.now();
  const elapsedMs = Math.max(endedAt - startedAt, 0);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function inferStepKind(eventType: string): string {
  if (eventType.includes("thinking")) {
    return "thinking";
  }
  if (eventType.includes("response") || eventType.includes("delta")) {
    return "response";
  }
  if (eventType.includes("file") || eventType.includes("edit")) {
    return "file_edit";
  }
  if (eventType.includes("tool")) {
    return "tool_call";
  }
  if (eventType.includes("command")) {
    return "command";
  }
  return "thinking";
}

function inferStepStatus(eventType: string): string {
  if (eventType.includes("completed") || eventType.includes("done")) {
    return "done";
  }
  if (eventType.includes("error") || eventType.includes("failed")) {
    return "error";
  }
  return "running";
}

export interface KanbanSyncResult {
  cards: TaskCard[];
  columns: Columns | null;
  error: string | null;
  loading: boolean;
  runs: TaskRun[];
}

export function useKanbanSync(
  connection: unknown,
  boardId: string | null
): KanbanSyncResult {
  const [cards, setCards] = useState<TaskCard[]>([]);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
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

      syncTable<TaskCard>("task_card", setCards);
      syncTable<TaskRun>("task_run", setRuns);
      syncTable<TaskDependency>("task_dependency", setDependencies);
      syncTable<AgentEvent>("agent_event", setEvents);
      syncTable<Lane>("lane", setLanes);

      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sync kanban tables"
      );
      setLoading(false);
    }

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [connection]);

  const filteredCards = boardId
    ? cards.filter((c) => c.boardId === boardId)
    : cards;

  const columns =
    filteredCards.length > 0
      ? buildKanbanColumns(filteredCards, runs, dependencies, events, lanes)
      : null;

  return {
    columns,
    cards: filteredCards,
    runs,
    loading,
    error,
  };
}
