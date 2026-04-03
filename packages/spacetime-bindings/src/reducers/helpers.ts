import type { AgentEvent } from "../tables/events";
import type { TaskCard, TaskDependency, TaskRun } from "../tables/tasks";

export type CardSortKey = "createdAt" | "updatedAt" | "status";

export function sortCardsBy(
  cards: TaskCard[],
  key: CardSortKey,
  direction: "asc" | "desc" = "asc"
): TaskCard[] {
  const statusOrder: Record<string, number> = {
    queue: 0,
    in_progress: 1,
    approve: 2,
    done: 3,
    failed: 4,
    aborted: 5,
  };

  const sorted = [...cards].sort((a, b) => {
    let comparison = 0;

    if (key === "createdAt") {
      comparison = Number(a.createdAt) - Number(b.createdAt);
    } else if (key === "updatedAt") {
      comparison = Number(a.updatedAt) - Number(b.updatedAt);
    } else if (key === "status") {
      comparison =
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

export function getCardsByBoard(
  cards: Iterable<TaskCard>
): Map<string, TaskCard[]> {
  const byBoard = new Map<string, TaskCard[]>();

  for (const card of cards) {
    const boardCards = byBoard.get(card.boardId) ?? [];
    boardCards.push(card);
    byBoard.set(card.boardId, boardCards);
  }

  return byBoard;
}

export function getCardsByStatus(
  cards: Iterable<TaskCard>
): Map<string, TaskCard[]> {
  const byStatus = new Map<string, TaskCard[]>();

  for (const card of cards) {
    const statusCards = byStatus.get(card.status) ?? [];
    statusCards.push(card);
    byStatus.set(card.status, statusCards);
  }

  return byStatus;
}

export function getRunsByCard(runs: Iterable<TaskRun>): Map<string, TaskRun[]> {
  const byCard = new Map<string, TaskRun[]>();

  for (const run of runs) {
    const cardRuns = byCard.get(run.cardId) ?? [];
    cardRuns.push(run);
    byCard.set(run.cardId, cardRuns);
  }

  return byCard;
}

export function getDownstreamCards(
  dependencies: Iterable<TaskDependency>,
  cardId: string
): string[] {
  const downstream: string[] = [];

  for (const dep of dependencies) {
    if (dep.upstreamCardId === cardId) {
      downstream.push(dep.downstreamCardId);
    }
  }

  return downstream;
}

export function getUpstreamCards(
  dependencies: Iterable<TaskDependency>,
  cardId: string
): string[] {
  const upstream: string[] = [];

  for (const dep of dependencies) {
    if (dep.downstreamCardId === cardId) {
      upstream.push(dep.upstreamCardId);
    }
  }

  return upstream;
}

export function getEventsByCard(
  events: Iterable<AgentEvent>,
  cardId: string
): AgentEvent[] {
  const result: AgentEvent[] = [];

  for (const event of events) {
    if (event.cardId === cardId) {
      result.push(event);
    }
  }

  return result;
}

export function getLatestRunForCard(
  runs: Iterable<TaskRun>,
  cardId: string
): TaskRun | null {
  let latest: TaskRun | null = null;

  for (const run of runs) {
    if (
      run.cardId === cardId &&
      (!latest || run.startedAt > latest.startedAt)
    ) {
      latest = run;
    }
  }

  return latest;
}

export function getActiveRuns(runs: Iterable<TaskRun>): TaskRun[] {
  const active: TaskRun[] = [];

  for (const run of runs) {
    if (run.status === "running" || run.status === "starting") {
      active.push(run);
    }
  }

  return active;
}

export function getCardsInRace(
  cards: Iterable<TaskCard>,
  raceGroupId: string
): TaskCard[] {
  const result: TaskCard[] = [];

  for (const card of cards) {
    if (card.raceGroupId === raceGroupId) {
      result.push(card);
    }
  }

  return result;
}
