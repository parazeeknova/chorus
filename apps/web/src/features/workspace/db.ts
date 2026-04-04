"use client";

import { Dexie, type EntityTable } from "dexie";
import type { WorkspaceBoard, WorkspaceHistoryEntry } from "./types";

interface WorkspaceSnapshotRecord {
  boards: WorkspaceBoard[];
  id: "current";
  selectedBoardId: string | null;
  updatedAt: number;
}

type WorkspaceDatabase = Dexie & {
  history: EntityTable<WorkspaceHistoryEntry, "id">;
  snapshots: EntityTable<WorkspaceSnapshotRecord, "id">;
};

const db = new Dexie("chorus-workspace") as WorkspaceDatabase;

db.version(1).stores({
  snapshots: "id, updatedAt",
  history: "&id, lastOpenedAt",
});

function createHistoryId(board: Pick<WorkspaceBoard, "repo">) {
  return board.repo.projectId ?? board.repo.worktree ?? board.repo.directory;
}

export function createHistoryEntry(
  board: WorkspaceBoard
): WorkspaceHistoryEntry {
  return {
    id: createHistoryId(board),
    title: board.title,
    lastOpenedAt: Date.now(),
    repo: board.repo,
  };
}

export function loadWorkspaceHistory(): Promise<WorkspaceHistoryEntry[]> {
  return db.history.orderBy("lastOpenedAt").reverse().toArray();
}

export async function loadWorkspaceSnapshot(): Promise<{
  boards: WorkspaceBoard[];
  selectedBoardId: string | null;
} | null> {
  const snapshot = await db.snapshots.get("current");
  if (!snapshot) {
    return null;
  }

  return {
    boards: snapshot.boards,
    selectedBoardId: snapshot.selectedBoardId,
  };
}

export async function persistWorkspaceSnapshot(input: {
  boards: WorkspaceBoard[];
  selectedBoardId: string | null;
}): Promise<void> {
  await db.transaction("rw", db.snapshots, db.history, async () => {
    await db.snapshots.put({
      id: "current",
      boards: input.boards,
      selectedBoardId: input.selectedBoardId,
      updatedAt: Date.now(),
    });

    const historyEntries = input.boards.map(createHistoryEntry);
    if (historyEntries.length > 0) {
      await db.history.bulkPut(historyEntries);
    }
  });
}
