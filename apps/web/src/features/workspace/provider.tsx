"use client";

import {
  boardSeedSchema,
  projectListResponseSchema,
  queueBoardPromptResponseSchema,
} from "@chorus/contracts";
import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import { useEffect, useEffectEvent, useState } from "react";
import {
  loadWorkspaceHistory,
  loadWorkspaceSnapshot,
  persistWorkspaceSnapshot,
} from "./db";
import {
  applyAgentEventToBoard,
  attachPromptTask,
  attachSessionToBoard,
  createBoardFromHistoryEntry,
  createBoardFromProject,
  createBoardFromSeed,
  createPromptTask,
  updateBoardColumns as nextBoardColumns,
  updateBoardPosition as nextBoardPosition,
} from "./state";
import type { AgentEventEnvelope, WorkspaceContextValue } from "./types";
import { WorkspaceContext } from "./workspace-context";

function getChorusWsUrl() {
  return process.env.NEXT_PUBLIC_CHORUS_WS_URL ?? "ws://localhost:2000/ws";
}

function getModelLabel(model?: { modelID: string; providerID: string }) {
  return model ? `${model.providerID}/${model.modelID}` : "OpenCode default";
}

export function ChorusWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [boards, setBoards] = useState<WorkspaceContextValue["boards"]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<
    WorkspaceContextValue["recentProjects"]
  >([]);
  const [previousWorkspaces, setPreviousWorkspaces] = useState<
    WorkspaceContextValue["previousWorkspaces"]
  >([]);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [isQueueingPrompt, setIsQueueingPrompt] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const selectedBoard = boards.find(
    (board) => board.boardId === selectedBoardId
  );

  const loadProjects = useEffectEvent(async () => {
    const response = await fetch("/api/projects", {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = projectListResponseSchema.parse(await response.json());
    setRecentProjects(payload.projects);
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function hydrateWorkspace() {
      try {
        const [snapshot, history] = await Promise.all([
          loadWorkspaceSnapshot(),
          loadWorkspaceHistory(),
        ]);

        if (isCancelled) {
          return;
        }

        setPreviousWorkspaces(history);

        if (snapshot) {
          setBoards(snapshot.boards);
          setSelectedBoardId(() => {
            const selected = snapshot.selectedBoardId;
            if (
              selected &&
              snapshot.boards.some((board) => board.boardId === selected)
            ) {
              return selected;
            }

            return snapshot.boards[0]?.boardId ?? null;
          });
        }
      } catch (error) {
        console.error("Failed to hydrate workspace", error);
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    }

    hydrateWorkspace().catch((error) => {
      console.error("Failed to hydrate workspace", error);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const persistTimeout = window.setTimeout(() => {
      persistWorkspaceSnapshot({
        boards,
        selectedBoardId,
      })
        .then(loadWorkspaceHistory)
        .then(setPreviousWorkspaces)
        .catch((error) => {
          console.error("Failed to persist workspace", error);
        });
    }, 200);

    return () => {
      window.clearTimeout(persistTimeout);
    };
  }, [boards, isHydrated, selectedBoardId]);

  const handleAgentEvent = useEffectEvent((event: NormalizedAgentEvent) => {
    if (!event.sessionID) {
      return;
    }

    setBoards((currentBoards) =>
      currentBoards.map((board) =>
        board.session.sessionId === event.sessionID
          ? applyAgentEventToBoard(board, event)
          : board
      )
    );
  });

  useEffect(() => {
    const socket = new WebSocket(getChorusWsUrl());

    socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as AgentEventEnvelope;
        if (!parsed.type.startsWith("agent.")) {
          return;
        }

        handleAgentEvent(parsed.payload);
      } catch (error) {
        console.error("Failed to parse Chorus event", error);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const openFolder = useEffectEvent(async () => {
    setIsOpeningFolder(true);

    try {
      const response = await fetch("/api/projects/open-folder", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to open folder");
      }

      const payload = await response.json();
      if (payload === null) {
        return;
      }

      const seed = boardSeedSchema.parse(payload);

      setBoards((currentBoards) => {
        const board = createBoardFromSeed(seed, currentBoards.length);
        setSelectedBoardId(board.boardId);
        return [...currentBoards, board];
      });

      loadProjects();
    } finally {
      setIsOpeningFolder(false);
    }
  });

  const createBoardFromRecentProject = useEffectEvent(
    (project: WorkspaceContextValue["recentProjects"][number]) => {
      setBoards((currentBoards) => {
        const board = createBoardFromProject(project, currentBoards.length);
        setSelectedBoardId(board.boardId);
        return [...currentBoards, board];
      });
    }
  );

  const createBoardFromHistory = useEffectEvent(
    (entry: WorkspaceContextValue["previousWorkspaces"][number]) => {
      setBoards((currentBoards) => {
        const board = createBoardFromHistoryEntry(entry, currentBoards.length);
        setSelectedBoardId(board.boardId);
        return [...currentBoards, board];
      });
    }
  );

  const queuePrompt = useEffectEvent(
    async (input: {
      agent?: string;
      model?: {
        modelID: string;
        providerID: string;
      };
      text: string;
    }) => {
      if (!selectedBoard) {
        return null;
      }

      const task = createPromptTask({
        board: selectedBoard,
        modelLabel: getModelLabel(input.model),
        prompt: input.text,
      });

      setBoards((currentBoards) =>
        currentBoards.map((board) =>
          board.boardId === selectedBoard.boardId
            ? {
                ...attachPromptTask(board, task),
                session: {
                  ...attachPromptTask(board, task).session,
                  state:
                    board.session.sessionId === undefined
                      ? "starting"
                      : "active",
                },
              }
            : board
        )
      );

      setIsQueueingPrompt(true);

      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            boardId: selectedBoard.boardId,
            directory: selectedBoard.repo.directory,
            projectId: selectedBoard.repo.projectId,
            sessionId: selectedBoard.session.sessionId,
            text: input.text,
            agent: input.agent,
            model: input.model,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to queue prompt");
        }

        const payload = queueBoardPromptResponseSchema.parse(
          await response.json()
        );

        setBoards((currentBoards) =>
          currentBoards.map((board) =>
            board.boardId === payload.boardId
              ? attachSessionToBoard(board, payload.sessionId)
              : board
          )
        );

        return {
          ...payload,
          task,
        };
      } catch (error) {
        setBoards((currentBoards) =>
          currentBoards.map((board) =>
            board.boardId === selectedBoard.boardId
              ? {
                  ...board,
                  session: {
                    ...board.session,
                    state: "error",
                    errorMessage:
                      error instanceof Error ? error.message : "Queue failed",
                    currentTaskId: undefined,
                  },
                }
              : board
          )
        );

        return null;
      } finally {
        setIsQueueingPrompt(false);
      }
    }
  );

  const value: WorkspaceContextValue = {
    boards,
    selectedBoardId,
    selectedBoard,
    recentProjects,
    previousWorkspaces,
    isOpeningFolder,
    isQueueingPrompt,
    loadProjects,
    openFolder,
    createBoardFromProject: createBoardFromRecentProject,
    createBoardFromHistory,
    selectBoard: setSelectedBoardId,
    clearSelection: () => setSelectedBoardId(null),
    updateBoardColumns: (boardId, columns) =>
      setBoards((currentBoards) =>
        currentBoards.map((board) =>
          board.boardId === boardId ? nextBoardColumns(board, columns) : board
        )
      ),
    updateBoardPosition: (boardId, position) =>
      setBoards((currentBoards) =>
        currentBoards.map((board) =>
          board.boardId === boardId ? nextBoardPosition(board, position) : board
        )
      ),
    queuePrompt,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
