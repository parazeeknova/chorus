import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  type BoardSeed,
  type WorkspaceBoard,
  type WorkspaceHistoryEntry,
  type WorkspaceMutation,
  type WorkspaceSnapshot,
  type WorkspaceSnapshotInput,
  workspaceSnapshotInputSchema,
  workspaceSnapshotSchema,
} from "@chorus/contracts";
import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import { applyAgentEventToBoard, attachSessionToBoard } from "./projector";

function createHistoryId(board: Pick<WorkspaceBoard, "repo">) {
  return board.repo.projectId ?? board.repo.worktree ?? board.repo.directory;
}

function createHistoryEntry(board: WorkspaceBoard): WorkspaceHistoryEntry {
  return {
    id: createHistoryId(board),
    title: board.title,
    lastOpenedAt: Date.now(),
    repo: board.repo,
  };
}

function sortHistory(entries: WorkspaceHistoryEntry[]) {
  return [...entries].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

const BOARD_X_OFFSET = 180;
const BOARD_Y_OFFSET = 120;
const BOARD_X_START = 120;
const BOARD_Y_START = 120;

function createBoardFromSeed(seed: BoardSeed, index: number): WorkspaceBoard {
  return {
    boardId: crypto.randomUUID(),
    title: seed.title,
    repo: seed.repo,
    position: {
      x: BOARD_X_START + index * BOARD_X_OFFSET,
      y: BOARD_Y_START + index * BOARD_Y_OFFSET,
    },
    columns: {
      queue: [],
      in_progress: [],
      approve: [],
      done: [],
    },
    modelSelection: null,
    session: {
      state: "uninitialized",
    },
  };
}

export class WorkspaceStore {
  readonly #filePath: string;
  readonly #processedMutationIds = new Set<string>();
  #snapshot: WorkspaceSnapshot = {
    boards: [],
    preferences: {
      composerHintDismissed: false,
      recentlyUsedModels: [],
      speechVoiceId: null,
    },
    previousWorkspaces: [],
    revision: 0,
    selectedBoardId: null,
  };

  constructor(filePath: string) {
    this.#filePath = filePath;
  }

  async load(): Promise<void> {
    try {
      const contents = await readFile(this.#filePath, "utf8");
      this.#snapshot = workspaceSnapshotSchema.parse(JSON.parse(contents));
    } catch {
      this.#snapshot = {
        boards: [],
        preferences: {
          composerHintDismissed: false,
          recentlyUsedModels: [],
          speechVoiceId: null,
        },
        previousWorkspaces: [],
        revision: 0,
        selectedBoardId: null,
      };
    }
  }

  getSnapshot(): WorkspaceSnapshot {
    return structuredClone(this.#snapshot);
  }

  getBoard(boardId: string): WorkspaceBoard | undefined {
    return this.#snapshot.boards.find((board) => board.boardId === boardId);
  }

  async replaceSnapshot(
    input: WorkspaceSnapshotInput
  ): Promise<WorkspaceSnapshot> {
    const parsed = workspaceSnapshotInputSchema.parse(input);
    const historyById = new Map(
      this.#snapshot.previousWorkspaces.map((entry) => [entry.id, entry])
    );

    for (const board of parsed.boards) {
      historyById.set(createHistoryId(board), createHistoryEntry(board));
    }

    this.#snapshot = {
      boards: parsed.boards,
      preferences: parsed.preferences,
      previousWorkspaces: sortHistory([...historyById.values()]),
      revision: this.#snapshot.revision + 1,
      selectedBoardId:
        parsed.selectedBoardId &&
        parsed.boards.some((board) => board.boardId === parsed.selectedBoardId)
          ? parsed.selectedBoardId
          : (parsed.boards[0]?.boardId ?? null),
    };

    await this.#persist();
    return this.getSnapshot();
  }

  async applyMutation(mutation: WorkspaceMutation): Promise<WorkspaceSnapshot> {
    if (this.#processedMutationIds.has(mutation.mutationId)) {
      return this.getSnapshot();
    }

    const snapshot = this.getSnapshot();
    let nextSnapshot: WorkspaceSnapshot;

    switch (mutation.type) {
      case "board.create": {
        const board = createBoardFromSeed(
          mutation.payload.seed,
          snapshot.boards.length
        );
        nextSnapshot = await this.replaceSnapshot({
          boards: [...snapshot.boards, board],
          preferences: snapshot.preferences,
          selectedBoardId: board.boardId,
        });
        break;
      }

      case "board.remove": {
        const boards = snapshot.boards.filter(
          (board) => board.boardId !== mutation.payload.boardId
        );
        nextSnapshot = await this.replaceSnapshot({
          boards,
          preferences: snapshot.preferences,
          selectedBoardId:
            snapshot.selectedBoardId === mutation.payload.boardId
              ? (boards[0]?.boardId ?? null)
              : snapshot.selectedBoardId,
        });
        break;
      }

      case "board.select": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards,
          preferences: snapshot.preferences,
          selectedBoardId:
            mutation.payload.boardId &&
            snapshot.boards.some(
              (board) => board.boardId === mutation.payload.boardId
            )
              ? mutation.payload.boardId
              : null,
        });
        break;
      }

      case "board.move": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards.map((board) =>
            board.boardId === mutation.payload.boardId
              ? {
                  ...board,
                  position: mutation.payload.position,
                }
              : board
          ),
          preferences: snapshot.preferences,
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      case "board.columns.replace": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards.map((board) =>
            board.boardId === mutation.payload.boardId
              ? {
                  ...board,
                  columns: mutation.payload.columns,
                }
              : board
          ),
          preferences: snapshot.preferences,
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      case "board.session.patch": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards.map((board) =>
            board.boardId === mutation.payload.boardId
              ? {
                  ...board,
                  session: {
                    ...board.session,
                    ...mutation.payload.session,
                  },
                }
              : board
          ),
          preferences: snapshot.preferences,
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      case "preference.dismiss_composer_hint": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards,
          preferences: {
            ...snapshot.preferences,
            composerHintDismissed: true,
          },
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      case "preference.speech_voice.set": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards,
          preferences: {
            ...snapshot.preferences,
            speechVoiceId: mutation.payload.voiceId,
          },
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      case "board.model.set": {
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards.map((board) =>
            board.boardId === mutation.payload.boardId
              ? {
                  ...board,
                  modelSelection: mutation.payload.model,
                }
              : board
          ),
          preferences: snapshot.preferences,
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      case "preference.recently_used_models.add": {
        const existing = snapshot.preferences.recentlyUsedModels;
        const filtered = existing.filter(
          (m) =>
            !(
              m.providerID === mutation.payload.model.providerID &&
              m.modelID === mutation.payload.model.modelID
            )
        );
        const updated = [mutation.payload.model, ...filtered].slice(0, 5);
        nextSnapshot = await this.replaceSnapshot({
          boards: snapshot.boards,
          preferences: {
            ...snapshot.preferences,
            recentlyUsedModels: updated,
          },
          selectedBoardId: snapshot.selectedBoardId,
        });
        break;
      }

      default: {
        throw new Error(
          `Unsupported workspace mutation type: ${String(mutation)}`
        );
      }
    }

    this.#rememberMutation(mutation.mutationId);
    return nextSnapshot;
  }

  async updateBoardSession(
    boardId: string,
    update: Partial<WorkspaceBoard["session"]>
  ): Promise<WorkspaceSnapshot> {
    const boards = this.#snapshot.boards.map((board) =>
      board.boardId === boardId
        ? (() => {
            if (update.sessionId) {
              const boardWithSession = attachSessionToBoard(
                board,
                update.sessionId
              );
              return {
                ...boardWithSession,
                session: {
                  ...boardWithSession.session,
                  ...update,
                },
              };
            }

            return {
              ...board,
              session: {
                ...board.session,
                ...update,
              },
            };
          })()
        : board
    );

    return await this.replaceSnapshot({
      boards,
      preferences: this.#snapshot.preferences,
      selectedBoardId: this.#snapshot.selectedBoardId,
    });
  }

  async applyAgentEvent(
    event: NormalizedAgentEvent
  ): Promise<WorkspaceSnapshot | null> {
    if (!event.sessionID) {
      return null;
    }

    let didChange = false;
    const boards = this.#snapshot.boards.map((board) => {
      if (board.session.sessionId !== event.sessionID) {
        return board;
      }

      didChange = true;
      return applyAgentEventToBoard(board, event);
    });

    if (!didChange) {
      return null;
    }

    return await this.replaceSnapshot({
      boards,
      preferences: this.#snapshot.preferences,
      selectedBoardId: this.#snapshot.selectedBoardId,
    });
  }

  async #persist(): Promise<void> {
    await mkdir(dirname(this.#filePath), { recursive: true });
    await writeFile(this.#filePath, JSON.stringify(this.#snapshot, null, 2));
  }

  #rememberMutation(mutationId: string): void {
    this.#processedMutationIds.add(mutationId);
    if (this.#processedMutationIds.size > 250) {
      const oldest = this.#processedMutationIds.values().next().value;
      if (oldest) {
        this.#processedMutationIds.delete(oldest);
      }
    }
  }
}
