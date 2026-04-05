import type {
  AgentRunContext,
  AgentStep,
  Columns,
  Task,
  WorkspaceBoard,
} from "@chorus/contracts";
import type { NormalizedAgentEvent } from "@chorus/oc-adapter";

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

function formatElapsed(startedAt: number) {
  const elapsedMs = Math.max(Date.now() - startedAt, 0);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function makeStepId(event: NormalizedAgentEvent): string {
  if (event.partID) {
    const msgPrefix = event.messageID ? `msg-${event.messageID}-` : "";
    return `part-${msgPrefix}${event.partID}`;
  }
  return `${event.type}-${event.timestamp}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function makeToolStep(event: NormalizedAgentEvent): AgentStep {
  const step: AgentStep = {
    id: makeStepId(event),
    kind: "tool_call",
    status: event.activity === "error" ? "error" : "done",
    summary: `${event.toolName}${event.toolState ? ` · ${event.toolState}` : ""}`,
    content: event.text,
  };

  if (event.fileDiff) {
    step.kind = "file_edit";
    step.filePath = event.fileDiff.filePath;
    step.originalContent = event.fileDiff.before;
    step.modifiedContent = event.fileDiff.after;
    step.linesAdded = event.fileDiff.additions;
    step.linesRemoved = event.fileDiff.deletions;
  }

  return step;
}

function buildStep(event: NormalizedAgentEvent): AgentStep | null {
  if (event.toolName) {
    return makeToolStep(event);
  }

  if (event.activity === "thinking") {
    return {
      id: makeStepId(event),
      kind: "thinking",
      status: "running",
      summary: event.text?.slice(0, 72) ?? "Thinking",
      content: event.text,
    };
  }

  if (event.activity === "writing") {
    return {
      id: makeStepId(event),
      kind: "response",
      status: "running",
      summary: event.text?.slice(0, 72) ?? "Streaming response",
      content: event.text,
    };
  }

  if (event.activity === "waiting_for_approval") {
    return {
      id: makeStepId(event),
      kind: "response",
      status: "running",
      summary: "Awaiting approval",
      content: event.permissionID,
    };
  }

  if (event.activity === "waiting_for_question") {
    const header = event.questions?.[0]?.header ?? "Question";
    return {
      id: makeStepId(event),
      kind: "response",
      status: "running",
      summary: header,
      content: event.questionID,
    };
  }

  if (event.activity === "error") {
    return {
      id: makeStepId(event),
      kind: "response",
      status: "error",
      summary: event.error ?? "Session error",
      content: event.error,
    };
  }

  return null;
}

function appendRunStep(task: Task, event: NormalizedAgentEvent): Task {
  const previousRun: AgentRunContext = task.run ?? {
    elapsed: "0m 00s",
    model: "OpenCode",
    sessionId: task.runId,
    startedAt: event.timestamp,
    steps: [],
    taskTitle: task.title,
  };

  const startedAt = previousRun.startedAt ?? event.timestamp;

  if (event.delta && event.partID) {
    const deltaStepId = `part-${event.partID}`;
    const existingStepIdx = previousRun.steps.findIndex((s) =>
      s.id.endsWith(deltaStepId)
    );

    if (existingStepIdx !== -1) {
      const existing = previousRun.steps[existingStepIdx];
      const updatedContent = (existing.content ?? "") + event.delta;
      const updatedStep: AgentStep = {
        ...existing,
        content: updatedContent,
        summary:
          updatedContent && updatedContent.length > 0
            ? updatedContent.slice(0, 72)
            : existing.summary,
      };
      const steps = previousRun.steps.map((s, i) =>
        i === existingStepIdx ? updatedStep : s
      );
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
  }

  const step = buildStep(event);

  const steps =
    step === null
      ? previousRun.steps
      : previousRun.steps
          .map<AgentStep>((entry) =>
            entry.status === "running" ? { ...entry, status: "done" } : entry
          )
          .concat(step);

  const rekeyedSteps = steps.map((s, i) => ({ ...s, id: `${s.id}-${i}` }));

  return {
    ...task,
    run: {
      ...previousRun,
      elapsed: formatElapsed(startedAt),
      startedAt,
      sessionId: event.sessionID ?? previousRun.sessionId,
      steps: rekeyedSteps,
    },
    runId: event.sessionID ?? task.runId,
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
      errorMessage: undefined,
      sessionId,
      state: "active",
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

  if (
    event.activity === "waiting_for_approval" ||
    event.activity === "waiting_for_question"
  ) {
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

  if (event.activity === "error" && event.type !== "session.timeout") {
    nextBoard = {
      ...nextBoard,
      columns: moveTask(nextBoard.columns, board.session.currentTaskId, "done"),
      session: {
        ...nextBoard.session,
        currentTaskId: undefined,
        errorMessage: event.error,
        state: "error",
      },
    };
  }

  if (event.type === "session.timeout") {
    nextBoard = {
      ...nextBoard,
      columns: moveTask(nextBoard.columns, board.session.currentTaskId, "done"),
    };
  }

  return nextBoard;
}
