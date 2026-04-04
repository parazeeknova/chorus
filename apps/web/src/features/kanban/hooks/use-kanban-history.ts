import posthog from "posthog-js";
import { useCallback, useRef, useState } from "react";
import type { Columns, Task } from "@/features/kanban/components/kanban";

interface KanbanHistoryEntry {
  columnsAfter: Columns;
  columnsBefore: Columns;
  prompt: string;
  task: Task;
  timestamp: number;
}

const MAX_HISTORY = 50;

function extractPromptFromTask(task: Task): string {
  if (!task.run?.steps) {
    return task.title;
  }

  const submitStep = task.run.steps.find(
    (step) =>
      step.kind === "thinking" &&
      step.summary === "Submitting prompt to OpenCode"
  );

  return submitStep?.content ?? task.title;
}

export function useKanbanHistory() {
  const [undoStack, setUndoStack] = useState<KanbanHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<KanbanHistoryEntry[]>([]);
  const stacksRef = useRef({ undo: undoStack, redo: redoStack });
  stacksRef.current = { undo: undoStack, redo: redoStack };

  const recordMove = useCallback(
    (columnsBefore: Columns, columnsAfter: Columns, task: Task) => {
      const prompt = extractPromptFromTask(task);

      posthog.capture("kanban_history_record", {
        taskId: task.id,
        taskTitle: task.title,
        promptLength: prompt.length,
        timestamp: Date.now(),
      });

      const entry: KanbanHistoryEntry = {
        columnsBefore,
        columnsAfter,
        task,
        prompt,
        timestamp: Date.now(),
      };

      setUndoStack((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
      setRedoStack([]);
    },
    []
  );

  const undo = useCallback((): {
    columns: Columns;
    prompt: string;
    task: Task;
  } | null => {
    const current = stacksRef.current;
    if (current.undo.length === 0) {
      posthog.capture("kanban_undo_empty");
      return null;
    }

    const entry = current.undo.at(-1);
    if (!entry) {
      return null;
    }

    posthog.capture("kanban_undo", {
      taskId: entry.task.id,
      taskTitle: entry.task.title,
      promptLength: entry.prompt.length,
      stackDepth: current.undo.length,
    });

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);

    return {
      columns: entry.columnsBefore,
      prompt: entry.prompt,
      task: entry.task,
    };
  }, []);

  const redo = useCallback((): {
    columns: Columns;
    task: Task;
  } | null => {
    const current = stacksRef.current;
    if (current.redo.length === 0) {
      posthog.capture("kanban_redo_empty");
      return null;
    }

    const entry = current.redo.at(-1);
    if (!entry) {
      return null;
    }

    posthog.capture("kanban_redo", {
      taskId: entry.task.id,
      taskTitle: entry.task.title,
      stackDepth: current.redo.length,
    });

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);

    return {
      columns: entry.columnsAfter,
      task: entry.task,
    };
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    canRedo: redoStack.length > 0,
    canUndo: undoStack.length > 0,
    clear,
    recordMove,
    redo,
    undo,
  };
}
