import type { ApprovalRequest, TaskCard, TaskRun } from "../tables/tasks";

export interface CardFilter {
  activity?: string;
  boardId?: string;
  raceGroupId?: string;
  status?: string | string[];
}

export interface RunFilter {
  cardId?: string;
  status?: string | string[];
}

export interface BoardFilter {
  projectId?: string;
}

export interface ApprovalFilter {
  cardId?: string;
  status?: string | string[];
}

export function buildCardQuery(filter: CardFilter): string {
  const conditions: string[] = [];

  if (filter.boardId) {
    conditions.push(`boardId = '${filter.boardId}'`);
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      const statuses = filter.status.map((s) => `'${s}'`).join(", ");
      conditions.push(`status IN (${statuses})`);
    } else {
      conditions.push(`status = '${filter.status}'`);
    }
  }

  if (filter.raceGroupId) {
    conditions.push(`raceGroupId = '${filter.raceGroupId}'`);
  }

  if (filter.activity) {
    conditions.push(`activity = '${filter.activity}'`);
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return `SELECT * FROM task_card${whereClause}`;
}

export function buildRunQuery(filter: RunFilter): string {
  const conditions: string[] = [];

  if (filter.cardId) {
    conditions.push(`cardId = '${filter.cardId}'`);
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      const statuses = filter.status.map((s) => `'${s}'`).join(", ");
      conditions.push(`status IN (${statuses})`);
    } else {
      conditions.push(`status = '${filter.status}'`);
    }
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return `SELECT * FROM task_run${whereClause}`;
}

export function buildBoardQuery(filter: BoardFilter): string {
  const conditions: string[] = [];

  if (filter.projectId) {
    conditions.push(`projectId = '${filter.projectId}'`);
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return `SELECT * FROM board${whereClause}`;
}

export function buildApprovalQuery(filter: ApprovalFilter): string {
  const conditions: string[] = [];

  if (filter.cardId) {
    conditions.push(`cardId = '${filter.cardId}'`);
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      const statuses = filter.status.map((s) => `'${s}'`).join(", ");
      conditions.push(`status IN (${statuses})`);
    } else {
      conditions.push(`status = '${filter.status}'`);
    }
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return `SELECT * FROM approval_request${whereClause}`;
}

export function filterCards(
  cards: Iterable<TaskCard>,
  filter: CardFilter
): TaskCard[] {
  const result: TaskCard[] = [];

  for (const card of cards) {
    if (filter.boardId && card.boardId !== filter.boardId) {
      continue;
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      if (!statuses.includes(card.status)) {
        continue;
      }
    }
    if (filter.raceGroupId && card.raceGroupId !== filter.raceGroupId) {
      continue;
    }
    if (filter.activity && card.activity !== filter.activity) {
      continue;
    }
    result.push(card);
  }

  return result;
}

export function filterRuns(
  runs: Iterable<TaskRun>,
  filter: RunFilter
): TaskRun[] {
  const result: TaskRun[] = [];

  for (const run of runs) {
    if (filter.cardId && run.cardId !== filter.cardId) {
      continue;
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      if (!statuses.includes(run.status)) {
        continue;
      }
    }
    result.push(run);
  }

  return result;
}

export function filterApprovals(
  approvals: Iterable<ApprovalRequest>,
  filter: ApprovalFilter
): ApprovalRequest[] {
  const result: ApprovalRequest[] = [];

  for (const approval of approvals) {
    if (filter.cardId && approval.cardId !== filter.cardId) {
      continue;
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      if (!statuses.includes(approval.status)) {
        continue;
      }
    }
    result.push(approval);
  }

  return result;
}
