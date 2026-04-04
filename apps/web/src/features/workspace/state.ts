import type { BoardSeed, RepoProject } from "@chorus/contracts";
import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import type { AgentStep } from "@/features/kanban/components/agent-output-card";
import type { Columns, Task } from "@/features/kanban/components/kanban";
import type { WorkspaceBoard } from "./types";

const BOARD_X_OFFSET = 180;
const BOARD_Y_OFFSET = 120;
const BOARD_X_START = 120;
const BOARD_Y_START = 120;

function createEmptyColumns(): Columns {
  return {
    queue: [],
    in_progress: [],
    approve: [],
    done: [],
  };
}

function createTaskId(boardId: string) {
  return `${boardId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatElapsed(startedAt: number) {
  const elapsedMs = Math.max(Date.now() - startedAt, 0);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function makeLabelVariant(columnId: keyof Columns): Task["labelVariant"] {
  switch (columnId) {
    case "approve":
      return "warning-light";
    case "done":
      return "success-light";
    case "in_progress":
      return "primary-light";
    default:
      return "info-light";
  }
}

function buildStep(event: NormalizedAgentEvent): AgentStep | null {
  const id = `${event.type}-${event.timestamp}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  if (event.toolName) {
    return {
      id,
      kind: "tool_call",
      status: event.activity === "error" ? "error" : "done",
      summary: `${event.toolName}${event.toolState ? ` · ${event.toolState}` : ""}`,
      content: event.text,
    };
  }

  if (event.activity === "thinking") {
    return {
      id,
      kind: "thinking",
      status: "running",
      summary: event.text?.slice(0, 72) ?? "Thinking",
      content: event.text,
    };
  }

  if (event.activity === "writing") {
    return {
      id,
      kind: "response",
      status: "running",
      summary: event.text?.slice(0, 72) ?? "Streaming response",
      content: event.text,
    };
  }

  if (event.activity === "waiting_for_approval") {
    return {
      id,
      kind: "response",
      status: "running",
      summary: "Awaiting approval",
      content: event.permissionID,
    };
  }

  if (event.activity === "error") {
    return {
      id,
      kind: "response",
      status: "error",
      summary: event.error ?? "Session error",
      content: event.error,
    };
  }

  return null;
}

function getBasename(directory: string) {
  const segments = directory.split("/").filter(Boolean);
  return segments.at(-1) ?? directory;
}

function withTaskUpdated(
  columns: Columns,
  taskId: string,
  updater: (task: Task) => Task
): Columns {
  return Object.fromEntries(
    Object.entries(columns).map(([columnId, tasks]) => [
      columnId,
      tasks.map((task) => (task.id === taskId ? updater(task) : task)),
    ])
  );
}

function removeTaskFromColumns(columns: Columns, taskId: string): Columns {
  return Object.fromEntries(
    Object.entries(columns).map(([columnId, tasks]) => [
      columnId,
      tasks.filter((task) => task.id !== taskId),
    ])
  );
}

function findTaskColumn(
  columns: Columns,
  taskId: string
): keyof Columns | null {
  for (const [columnId, tasks] of Object.entries(columns)) {
    if (tasks.some((task) => task.id === taskId)) {
      return columnId as keyof Columns;
    }
  }

  return null;
}

function moveTask(
  columns: Columns,
  taskId: string,
  targetColumn: keyof Columns
): Columns {
  const task = Object.values(columns)
    .flat()
    .find((entry) => entry.id === taskId);

  if (!task) {
    return columns;
  }

  const withoutTask = removeTaskFromColumns(columns, taskId);
  const nextTask = {
    ...task,
    labelVariant: makeLabelVariant(targetColumn),
  };

  return {
    ...withoutTask,
    [targetColumn]: [...withoutTask[targetColumn], nextTask],
  };
}

function appendRunStep(task: Task, event: NormalizedAgentEvent): Task {
  const step = buildStep(event);
  const previousRun = task.run ?? {
    elapsed: "0m 00s",
    model: "OpenCode",
    sessionId: task.runId,
    startedAt: event.timestamp,
    steps: [],
    taskTitle: task.title,
  };

  const startedAt = previousRun.startedAt ?? event.timestamp;
  const steps =
    step === null
      ? previousRun.steps
      : previousRun.steps
          .map<AgentStep>((entry) =>
            entry.status === "running" ? { ...entry, status: "done" } : entry
          )
          .concat(step);

  return {
    ...task,
    run: {
      ...previousRun,
      elapsed: formatElapsed(startedAt),
      startedAt,
      sessionId: event.sessionID ?? previousRun.sessionId,
      steps,
    },
    runId: event.sessionID ?? task.runId,
  };
}

export function createBoardFromSeed(
  seed: BoardSeed,
  index: number
): WorkspaceBoard {
  return {
    boardId: crypto.randomUUID(),
    title: seed.title,
    repo: seed.repo,
    position: {
      x: BOARD_X_START + index * BOARD_X_OFFSET,
      y: BOARD_Y_START + index * BOARD_Y_OFFSET,
    },
    columns: createEmptyColumns(),
    session: {
      state: "uninitialized",
    },
  };
}

export function createBoardFromProject(
  project: RepoProject,
  index: number
): WorkspaceBoard {
  return createBoardFromSeed(
    {
      title: project.projectName ?? getBasename(project.directory),
      repo: {
        ...project,
      },
    },
    index
  );
}

export function createBoardFromHistoryEntry(
  entry: Pick<WorkspaceBoard, "repo" | "title">,
  index: number
): WorkspaceBoard {
  return createBoardFromSeed(
    {
      title: entry.title,
      repo: entry.repo,
    },
    index
  );
}

export function createPromptTask(input: {
  board: WorkspaceBoard;
  modelLabel: string;
  prompt: string;
}): Task {
  const taskId = createTaskId(input.board.boardId);
  const startedAt = Date.now();

  return {
    id: taskId,
    title: input.prompt.slice(0, 96),
    label:
      input.board.repo.projectName ?? getBasename(input.board.repo.directory),
    labelVariant: "primary-light",
    run: {
      elapsed: "0m 00s",
      model: input.modelLabel,
      startedAt,
      steps: [
        {
          id: `${taskId}-queued`,
          kind: "thinking",
          status: "running",
          summary: "Submitting prompt to OpenCode",
          content: input.prompt,
        },
      ],
      taskTitle: input.prompt.slice(0, 96),
    },
  };
}

export function attachPromptTask(
  board: WorkspaceBoard,
  task: Task
): WorkspaceBoard {
  return {
    ...board,
    columns: {
      ...board.columns,
      in_progress: [...board.columns.in_progress, task],
    },
    session: {
      ...board.session,
      currentTaskId: task.id,
      errorMessage: undefined,
    },
  };
}

export function attachSessionToBoard(
  board: WorkspaceBoard,
  sessionId: string
): WorkspaceBoard {
  const columns = board.session.currentTaskId
    ? withTaskUpdated(board.columns, board.session.currentTaskId, (task) => ({
        ...task,
        runId: sessionId,
        run: task.run
          ? {
              ...task.run,
              sessionId,
            }
          : task.run,
      }))
    : board.columns;

  return {
    ...board,
    columns,
    session: {
      ...board.session,
      sessionId,
      state: "active",
      errorMessage: undefined,
    },
  };
}

export function applyAgentEventToBoard(
  board: WorkspaceBoard,
  event: NormalizedAgentEvent
): WorkspaceBoard {
  if (
    !board.session.currentTaskId ||
    board.session.sessionId !== event.sessionID
  ) {
    return board;
  }

  let nextBoard: WorkspaceBoard = {
    ...board,
    columns: withTaskUpdated(
      board.columns,
      board.session.currentTaskId,
      (task) => appendRunStep(task, event)
    ),
  };

  if (event.activity === "waiting_for_approval") {
    nextBoard = {
      ...nextBoard,
      columns: moveTask(
        nextBoard.columns,
        board.session.currentTaskId,
        "approve"
      ),
    };
  }

  if (event.activity === "writing" || event.activity === "thinking") {
    const currentColumn = findTaskColumn(
      nextBoard.columns,
      board.session.currentTaskId
    );

    if (currentColumn !== "in_progress") {
      nextBoard = {
        ...nextBoard,
        columns: moveTask(
          nextBoard.columns,
          board.session.currentTaskId,
          "in_progress"
        ),
      };
    }
  }

  if (event.activity === "idle") {
    nextBoard = {
      ...nextBoard,
      columns: moveTask(nextBoard.columns, board.session.currentTaskId, "done"),
      session: {
        ...nextBoard.session,
        currentTaskId: undefined,
        state: "active",
      },
    };
  }

  if (event.activity === "error") {
    nextBoard = {
      ...nextBoard,
      columns: moveTask(nextBoard.columns, board.session.currentTaskId, "done"),
      session: {
        ...nextBoard.session,
        currentTaskId: undefined,
        state: "error",
        errorMessage: event.error,
      },
    };
  }

  return nextBoard;
}

export function updateBoardPosition(
  board: WorkspaceBoard,
  position: { x: number; y: number }
): WorkspaceBoard {
  return {
    ...board,
    position,
  };
}

export function updateBoardColumns(
  board: WorkspaceBoard,
  columns: Columns
): WorkspaceBoard {
  return {
    ...board,
    columns,
  };
}
