"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cva } from "class-variance-authority";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CheckIcon,
  CogIcon,
  EyeIcon,
  ListTodoIcon,
  LoaderIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchCheckIcon,
  XIcon,
} from "lucide-react";
import {
  type ComponentProps,
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  AgentOutputCard,
  type AgentRunContext,
  type AgentStep,
  PLACEHOLDER_RUN,
} from "@/features/kanban/components/agent-output-card";
import { cn } from "@/lib/utils";
import { type GroupedStep, groupSteps } from "../utils/group-steps";

export interface ChangedFile {
  added: number;
  path: string;
  removed: number;
}

export interface Task {
  /** Files changed by the agent — shown in review cards */
  changedFiles?: ChangedFile[];
  id: string;
  label: string;
  labelVariant:
    | "primary-light"
    | "success-light"
    | "warning-light"
    | "destructive-light"
    | "info-light";
  /** Lines added by the agent run — shown in done cards */
  linesAdded?: number;
  /** Lines removed by the agent run — shown in done cards */
  linesRemoved?: number;
  /** AI-generated plan for the task — shown in review cards for MANUAL mode */
  plan?: string;
  /** Questions from AI that need user input — shown in review cards for MANUAL mode */
  questions?: string[];
  /** Live or recorded run state shown in the in-progress card */
  run?: AgentRunContext;
  /** Links to an OpenCode sessionId for live agent output */
  runId?: string;
  /** Short paragraph describing what the agent did — shown in done cards */
  summary?: string;
  /** Files tagged/referenced by this task — shown in queue cards */
  taggedFiles?: string[];
  title: string;
}

export type Columns = Record<string, Task[]>;

export interface KanbanCardData {
  columns: Columns;
  id: string;
  reviewMode?: "manual" | "auto";
  title: string;
}

interface KanbanContextValue {
  activeId: string | null;
  getItemValue: (item: Task) => string;
  onValueChange: (columns: Columns) => void;
  value: Columns;
}

const KanbanContext = createContext<KanbanContextValue | null>(null);

function useKanbanContext() {
  const ctx = useContext(KanbanContext);
  if (!ctx) {
    throw new Error("Kanban components must be used within a Kanban");
  }
  return ctx;
}

const badgeVariants = cva(
  "inline-flex items-center rounded-xs font-medium text-xs transition-colors",
  {
    variants: {
      variant: {
        "primary-light":
          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        "success-light":
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        "warning-light":
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        "destructive-light":
          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        "info-light":
          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
        outline: "border border-border bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5",
        default: "px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "primary-light",
      size: "default",
    },
  }
);

export function Badge({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"span"> & {
  variant?:
    | "primary-light"
    | "success-light"
    | "warning-light"
    | "destructive-light"
    | "info-light"
    | "outline";
  size?: "sm" | "default";
}) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export function Kanban({
  id,
  value,
  onValueChange,
  getItemValue,
  children,
}: {
  id?: string;
  value: Columns;
  onValueChange: (columns: Columns) => void;
  getItemValue: (item: Task) => string;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const fallbackId = useId();
  const dndContextId = id ?? fallbackId;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 2 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findTaskById = useCallback(
    (columns: Columns, id: string): Task | null => {
      for (const tasks of Object.values(columns)) {
        const found = tasks.find((t) => getItemValue(t) === id);
        if (found) {
          return found;
        }
      }
      return null;
    },
    [getItemValue]
  );

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id.toString();
    setActiveId(id);
    setActiveTask(findTaskById(value, id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) {
      return;
    }

    const activeContainer = Object.entries(value).find(([, tasks]) =>
      tasks.some((t) => getItemValue(t) === activeId)
    );
    const overContainer = Object.entries(value).find(([, tasks]) =>
      tasks.some((t) => getItemValue(t) === overId)
    );

    if (!(activeContainer && overContainer)) {
      return;
    }

    const [activeColId, activeTasks] = activeContainer;
    const [overColId, overTasks] = overContainer;

    const activeIndex = activeTasks.findIndex(
      (t) => getItemValue(t) === activeId
    );
    const overIndex = overTasks.findIndex((t) => getItemValue(t) === overId);

    if (activeColId === overColId) {
      const newTasks = arrayMove(activeTasks, activeIndex, overIndex);
      onValueChange({ ...value, [activeColId]: newTasks });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) {
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) {
      return;
    }

    const activeContainer = Object.entries(value).find(([, tasks]) =>
      tasks.some((t) => getItemValue(t) === activeId)
    );
    const overContainer = Object.entries(value).find(([, tasks]) =>
      tasks.some((t) => getItemValue(t) === overId)
    );

    if (!(activeContainer && overContainer)) {
      return;
    }

    const [activeColId, activeTasks] = activeContainer;
    const [overColId, overTasks] = overContainer;

    const activeIndex = activeTasks.findIndex(
      (t) => getItemValue(t) === activeId
    );
    const overIndex = overTasks.findIndex((t) => getItemValue(t) === overId);

    if (activeColId === overColId) {
      const newTasks = arrayMove(activeTasks, activeIndex, overIndex);
      onValueChange({ ...value, [activeColId]: newTasks });
    }
  }

  return (
    <KanbanContext.Provider
      value={{ value, onValueChange, getItemValue, activeId }}
    >
      <DndContext
        collisionDetection={closestCorners}
        id={dndContextId}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {children}
        {isMounted
          ? createPortal(
              <DragOverlay>
                {activeTask ? (
                  <div className="rotate-2 scale-105 opacity-90">
                    <div className="rounded-xs border border-border/50 bg-card p-3 text-[14px] shadow-xl dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-2xl">
                      <span className="font-medium text-foreground text-sm dark:text-white/90">
                        {activeTask.title}
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body
            )
          : null}
      </DndContext>
    </KanbanContext.Provider>
  );
}

function KanbanBoard({ className, children }: ComponentProps<"div">) {
  return <div className={cn("grid gap-3", className)}>{children}</div>;
}

function KanbanColumn({
  value: columnId,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex h-full min-h-0 flex-col", className)}
      data-column={columnId}
    >
      {children}
    </div>
  );
}

function KanbanColumnContent({
  value: columnId,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value, getItemValue } = useKanbanContext();
  const tasks = value[columnId] || [];
  const itemIds = tasks.map((t) => getItemValue(t));

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <div className={cn("min-h-20", className)}>{children}</div>
    </SortableContext>
  );
}

function KanbanItem({
  value,
  children,
  className,
  disabled,
  ...props
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & ComponentProps<"div">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      className={cn(
        disabled ? "" : "cursor-grab active:cursor-grabbing",
        className
      )}
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      {...props}
    >
      {children}
    </div>
  );
}

function KanbanItemHandle({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("touch-none", className)} {...props}>
      {children}
    </div>
  );
}

const COLUMNS: Record<
  string,
  {
    title: string;
    icon: React.ReactNode;
    accent: string;
    emptyIcon: React.ComponentType<{ className?: string }>;
    emptyHeadline: string;
    emptyHint: string;
  }
> = {
  queue: {
    title: "Queue",
    icon: <ListTodoIcon className="size-4.5 text-white/35" />,
    accent: "bg-white/24",
    emptyIcon: ListTodoIcon,
    emptyHeadline: "Nothing lined up yet",
    emptyHint: 'Hit "Create Task" to give the agents something to chew on.',
  },
  in_progress: {
    title: "In Progress",
    icon: <LoaderIcon className="size-4.5 text-sky-400/60" />,
    accent: "bg-sky-400/55",
    emptyIcon: CogIcon,
    emptyHeadline: "All quiet on the agent front",
    emptyHint: "Agents will appear here once a task is running.",
  },
  approve: {
    title: "Review",
    icon: <EyeIcon className="size-4.5 text-amber-400/60" />,
    accent: "bg-amber-400/55",
    emptyIcon: SearchCheckIcon,
    emptyHeadline: "Nothing needs your eyes",
    emptyHint: "Completed tasks awaiting a human call will land here.",
  },
  done: {
    title: "Done",
    icon: <CheckCircle2Icon className="size-4.5 text-emerald-400/60" />,
    accent: "bg-emerald-400/55",
    emptyIcon: ArchiveIcon,
    emptyHeadline: "The slate is clean",
    emptyHint: "Shipped work stacks up here. Start something great.",
  },
};

function ColumnEmptyState({
  icon: Icon,
  headline,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  hint: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <Icon className="size-8 text-zinc-800" />
      <div className="flex flex-col gap-1">
        <p className="font-medium text-[0.75rem] text-white/30">{headline}</p>
        <p className="text-[0.68rem] text-white/18 leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}

function FilePill({ path }: { path: string }) {
  // Show only the last two path segments for brevity
  const parts = path.replace(/\\/g, "/").split("/");
  const label = parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xs bg-white/4 px-1.5 py-0.5 font-mono text-[0.6rem] text-white/35 ring-1 ring-white/6 ring-inset transition-colors hover:bg-white/7 hover:text-white/55"
      title={path}
    >
      <span className="opacity-50">#</span>
      {label}
    </span>
  );
}

function ChangedFileRow({ file }: { file: ChangedFile }) {
  const parts = file.path.replace(/\\/g, "/").split("/");
  const label = parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : file.path;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className="flex-1 truncate font-mono text-[0.62rem] text-white/40"
        title={file.path}
      >
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {file.added > 0 && (
          <span className="inline-flex items-center rounded-xs bg-emerald-500/10 px-1 py-0 font-mono text-[0.58rem] text-emerald-400/75">
            +{file.added}
          </span>
        )}
        {file.removed > 0 && (
          <span className="inline-flex items-center rounded-xs bg-red-500/10 px-1 py-0 font-mono text-[0.58rem] text-red-400/65">
            -{file.removed}
          </span>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  asHandle?: boolean;
  draggable?: boolean;
  onApprove?: (taskId: string, plan: string, answers: string[]) => void;
  onPlanChange?: (taskId: string, plan: string) => void;
  onQuestionsAnswered?: (taskId: string, answers: string[]) => void;
  onReject?: (taskId: string) => void;
  reviewMode?: "manual" | "auto";
  showApprovalControls?: boolean;
  showDone?: boolean;
  showOutput?: boolean;
  showPlay?: boolean;
  task: Task;
}

function DoneStepRow({ step }: { step: AgentStep }) {
  const kindIcons: Record<AgentStep["kind"], string> = {
    thinking: "💭",
    response: "💬",
    tool_call: "⚙️",
    file_edit: "📝",
    command: "⌨️",
  };

  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 font-mono text-[0.62rem] text-white/30">
        {kindIcons[step.kind] ?? "•"}
      </span>
      <span className="min-w-0 flex-1 font-mono text-[0.68rem] text-white/50 leading-relaxed">
        {step.summary}
      </span>
    </div>
  );
}

function DoneGroupedStepRow({ group }: { group: GroupedStep }) {
  switch (group.kind) {
    case "thinking":
    case "response":
      return (
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 font-mono text-[0.62rem] text-white/30">
            {group.kind === "thinking" ? "💭" : "💬"}
          </span>
          <span className="min-w-0 flex-1 font-mono text-[0.68rem] text-white/50 leading-relaxed">
            {group.summary}
          </span>
          {group.sourceSteps.length > 1 && (
            <span className="rounded-xs bg-white/5 px-1 py-0.5 font-mono text-[0.55rem] text-white/25">
              ×{group.sourceSteps.length}
            </span>
          )}
        </div>
      );
    case "file_edit":
      return <DoneStepRow step={group.step} />;
    case "tool_call":
    case "command":
      return <DoneStepRow step={group.step} />;
    default:
      return null;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TaskCard renders multiple conditional sections for different task states (queue, in_progress, review, done)
function TaskCard({
  task,
  asHandle,
  draggable,
  showOutput,
  showDone,
  showApprovalControls,
  showPlay,
  reviewMode = "auto",
  onApprove,
  onReject,
  onPlanChange,
  onQuestionsAnswered,
}: TaskCardProps) {
  const [editedPlan, setEditedPlan] = useState(task.plan ?? "");
  const [questionAnswers, setQuestionAnswers] = useState<string[]>(
    task.questions?.map(() => "") ?? []
  );

  useEffect(() => {
    setEditedPlan(task.plan ?? "");
  }, [task.plan]);

  useEffect(() => {
    setQuestionAnswers(task.questions?.map(() => "") ?? []);
  }, [task.questions]);

  const isManualReview = showApprovalControls && reviewMode === "manual";

  const handleApproveClick = () => {
    if (isManualReview && onApprove) {
      if (editedPlan !== task.plan && onPlanChange) {
        onPlanChange(task.id, editedPlan);
      }
      onApprove(task.id, editedPlan, questionAnswers);
    } else if (onApprove) {
      onApprove(task.id, "", []);
    }
  };

  const handleQuestionChange = (qIndex: number, value: string) => {
    const newAnswers = [...questionAnswers];
    newAnswers[qIndex] = value;
    setQuestionAnswers(newAnswers);
    if (onQuestionsAnswered) {
      onQuestionsAnswered(task.id, newAnswers);
    }
  };

  const content = (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-sm border border-border/50 bg-card p-3.5 shadow-sm",
        "transition-all duration-200 hover:border-border hover:shadow-md",
        "dark:border-white/8 dark:bg-white/2.5"
      )}
    >
      <span className="font-medium text-[0.85rem] text-foreground leading-snug dark:text-white/85">
        {task.title}
      </span>

      {isManualReview && (
        <div className="flex flex-col gap-3 border-white/5 border-t pt-2.5">
          {/* Plan Section - always editable textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[0.7rem] text-amber-400 uppercase tracking-wider">
                Plan
              </span>
            </div>
            <textarea
              className="min-h-[120px] w-full resize-y rounded-xs border border-white/10 bg-white/5 p-2.5 font-mono text-[0.72rem] text-white/70 leading-relaxed placeholder:text-white/20 focus:border-amber-400/40 focus:outline-none"
              onChange={(e) => setEditedPlan(e.target.value)}
              placeholder="AI will generate a plan here. You can edit it directly..."
              value={editedPlan}
            />
          </div>

          {/* Questions Section */}
          {task.questions && task.questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-[0.7rem] text-amber-400 uppercase tracking-wider">
                Questions
              </span>
              {task.questions.map((question, qIndex) => (
                <div className="flex flex-col gap-1" key={question}>
                  <p className="text-[0.7rem] text-white/60 leading-relaxed">
                    {question}
                  </p>
                  <input
                    className="w-full rounded-xs border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[0.7rem] text-white/70 leading-relaxed placeholder:text-white/20 focus:border-amber-400/40 focus:outline-none"
                    onChange={(e) =>
                      handleQuestionChange(qIndex, e.target.value)
                    }
                    placeholder="Your answer..."
                    type="text"
                    value={questionAnswers[qIndex] ?? ""}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no plan yet */}
          {!task.plan && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="text-[0.72rem] text-white/30">
                Waiting for AI to generate a plan...
              </span>
            </div>
          )}
        </div>
      )}

      {showApprovalControls &&
        reviewMode === "auto" &&
        task.changedFiles &&
        task.changedFiles.length > 0 && (
          <div className="flex flex-col gap-1 border-white/5 border-t pt-2.5">
            {task.changedFiles.map((f) => (
              <ChangedFileRow file={f} key={f.path} />
            ))}
          </div>
        )}

      {showDone && (
        <div className="flex flex-col gap-2.5 border-white/5 border-t pt-2.5">
          {task.run && task.run.steps.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {groupSteps(task.run.steps).map((group) => (
                <DoneGroupedStepRow
                  group={group}
                  key={
                    group.kind === "thinking" || group.kind === "response"
                      ? group.id
                      : group.step.id
                  }
                />
              ))}
            </div>
          )}
          {!task.run && task.summary && (
            <p className="text-[0.72rem] text-white/38 leading-relaxed">
              {task.summary}
            </p>
          )}
          {(task.linesAdded !== undefined ||
            task.linesRemoved !== undefined) && (
            <div className="flex items-center gap-1.5">
              {task.linesAdded !== undefined && task.linesAdded > 0 && (
                <span className="inline-flex items-center rounded-xs bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[0.62rem] text-emerald-400/80">
                  +{task.linesAdded}
                </span>
              )}
              {task.linesRemoved !== undefined && task.linesRemoved > 0 && (
                <span className="inline-flex items-center rounded-xs bg-red-500/10 px-1.5 py-0.5 font-mono text-[0.62rem] text-red-400/70">
                  -{task.linesRemoved}
                </span>
              )}
              <span className="text-[0.62rem] text-white/20">
                lines changed
              </span>
            </div>
          )}
        </div>
      )}

      {showPlay && task.taggedFiles && task.taggedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {task.taggedFiles.map((f) => (
            <FilePill key={f} path={f} />
          ))}
        </div>
      )}

      {showPlay && (
        <div className="flex items-center justify-end pt-0.5">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-xs border border-white/6 bg-white/6 px-2.5 py-1.5",
              "font-medium text-[0.7rem] text-white/50",
              "transition-all duration-150",
              "hover:border-emerald-500/20 hover:bg-emerald-500/12 hover:text-emerald-400",
              "active:scale-[0.97]"
            )}
            title="Run task"
            type="button"
          >
            <PlayIcon className="size-3 fill-current" />
            Run
          </button>
        </div>
      )}

      {showApprovalControls &&
        reviewMode === "auto" &&
        task.changedFiles &&
        task.changedFiles.length > 0 && (
          <div className="flex flex-col gap-1 border-white/5 border-t pt-2.5">
            {task.changedFiles.map((f) => (
              <ChangedFileRow file={f} key={f.path} />
            ))}
          </div>
        )}

      {showApprovalControls && (
        <div className="flex items-center justify-end gap-1.5 pt-0.5">
          <button
            className={cn(
              "flex items-center gap-1 rounded-xs border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1.5",
              "font-medium text-[0.7rem] text-emerald-400",
              "transition-all duration-150 hover:border-emerald-500/30 hover:bg-emerald-500/20",
              "active:scale-[0.97]"
            )}
            onClick={handleApproveClick}
            title={isManualReview ? "Finalize & Implement" : "Approve"}
            type="button"
          >
            <CheckIcon className="size-3.5" />
          </button>
          <button
            className={cn(
              "flex items-center gap-1 rounded-xs border border-rose-500/15 bg-rose-500/10 px-2.5 py-1.5",
              "font-medium text-[0.7rem] text-rose-400",
              "transition-all duration-150 hover:border-rose-500/30 hover:bg-rose-500/20",
              "active:scale-[0.97]"
            )}
            onClick={() => onReject?.(task.id)}
            title="Reject"
            type="button"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}

      {showDone && (
        <div className="flex items-center justify-end pt-0.5">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-xs border border-white/6 bg-white/4 px-2.5 py-1.5",
              "font-medium text-[0.7rem] text-white/30",
              "transition-all duration-150 hover:border-white/10 hover:bg-white/8 hover:text-white/55",
              "active:scale-[0.97]"
            )}
            title="Retry task"
            type="button"
          >
            <RotateCcwIcon className="size-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );

  const contentNode =
    asHandle && draggable ? (
      <KanbanItemHandle>{content}</KanbanItemHandle>
    ) : (
      content
    );

  return (
    <KanbanItem disabled={!draggable} value={task.id}>
      {showOutput ? (
        <>
          {contentNode}
          <div className="flex">
            <div className="ml-5 flex flex-col items-center">
              <div className="h-2 w-px bg-linear-to-b from-white/5 to-white/15" />
              <div className="size-1.5 rounded-full border border-white/20 bg-white/10" />
              <div className="h-1.5 w-px bg-linear-to-b from-white/15 to-white/5" />
            </div>
          </div>
          <AgentOutputCard
            run={
              task.run ?? {
                ...PLACEHOLDER_RUN,
                sessionId: task.runId,
                taskTitle: task.title,
              }
            }
          />
        </>
      ) : (
        contentNode
      )}
    </KanbanItem>
  );
}

function defaultColumns(boardId = "board"): Columns {
  return {
    queue: [
      {
        id: `${boardId}-queue-auth-middleware`,
        title:
          "Refactor the auth middleware to use JWT RS256 and add refresh token rotation",
        label: "Backend",
        labelVariant: "primary-light",
        taggedFiles: [
          "apps/serve/src/middleware/auth.ts",
          "apps/serve/src/lib/jwt.ts",
          "apps/serve/src/routes/session.ts",
        ],
      },
      {
        id: `${boardId}-queue-landing-page`,
        title:
          "Design a dark-mode landing page with hero section and pricing table",
        label: "Design",
        labelVariant: "info-light",
        taggedFiles: ["apps/web/src/app/page.tsx"],
      },
      {
        id: `${boardId}-queue-cicd`,
        title:
          "Set up GitHub Actions CI/CD pipeline with Turbo cache and preview deploys",
        label: "DevOps",
        labelVariant: "warning-light",
        taggedFiles: [".github/workflows/ci.yml", "turbo.json"],
      },
    ],
    in_progress: [
      {
        id: `${boardId}-in-progress-cursors`,
        title:
          "Implement real-time collaborative cursor tracking via WebSocket",
        label: "Frontend",
        labelVariant: "primary-light",
      },
    ],
    approve: [
      {
        id: `${boardId}-approve-dark-mode-palette`,
        title: "Update color palette for dark mode compatibility",
        label: "Design",
        labelVariant: "info-light",
        changedFiles: [
          { path: "apps/web/src/styles/tokens.css", added: 47, removed: 12 },
          {
            path: "apps/web/src/components/ui/button.tsx",
            added: 8,
            removed: 5,
          },
          { path: "apps/web/tailwind.config.ts", added: 23, removed: 9 },
        ],
      },
    ],
    done: [
      {
        id: `${boardId}-done-monorepo-foundation`,
        title:
          "Project kickoff — repo structure, monorepo config, base design system",
        label: "Planning",
        labelVariant: "info-light",
        summary:
          "Initialised Turborepo monorepo with apps/web and apps/serve, configured shared tsconfig and Tailwind design tokens, set up ESLint + Prettier pipeline.",
        linesAdded: 312,
        linesRemoved: 0,
      },
    ],
  };
}

function ReviewModeToggle({
  reviewMode,
  onToggle,
}: {
  reviewMode: "manual" | "auto";
  onToggle: (mode: "manual" | "auto") => void;
}) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 transition-colors hover:bg-white/5"
      onClick={() => onToggle(reviewMode === "manual" ? "auto" : "manual")}
      title={
        reviewMode === "manual"
          ? "Switch to auto-accept"
          : "Switch to manual review"
      }
      type="button"
    >
      <span
        className={cn(
          "font-medium text-[0.6rem] uppercase tracking-wider transition-colors",
          reviewMode === "manual" ? "text-amber-400" : "text-white/25"
        )}
      >
        {reviewMode === "manual" ? "Manual" : "Auto"}
      </span>
      <span
        className={cn(
          "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-all duration-200",
          reviewMode === "manual"
            ? "bg-amber-500/35 shadow-[0_0_8px_rgba(251,191,36,0.25)]"
            : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute size-2.5 rounded-full shadow-sm transition-all duration-200",
            reviewMode === "manual"
              ? "left-[calc(100%-2px)] -translate-x-full bg-amber-400"
              : "left-0.5 bg-white/35"
          )}
        />
      </span>
    </button>
  );
}

function ColumnHeader({
  columnId,
  tasks,
  reviewMode,
  onReviewModeChange,
}: {
  columnId: string;
  tasks: Task[];
  reviewMode: "manual" | "auto";
  onReviewModeChange: (mode: "manual" | "auto") => void;
}) {
  const col = COLUMNS[columnId];
  const isReview = columnId === "approve";

  return (
    <div className="flex items-center gap-2 px-1 pt-0.5 pb-0.5">
      {col.icon}
      <h3 className="truncate font-semibold text-[0.7rem] text-muted-foreground uppercase tracking-widest dark:text-white/40">
        {col.title}
      </h3>
      <div className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-white/6 font-semibold text-[10px] text-white/45">
        {tasks.length}
      </div>
      {isReview && (
        <ReviewModeToggle
          onToggle={onReviewModeChange}
          reviewMode={reviewMode}
        />
      )}
    </div>
  );
}

function TaskList({
  columnId,
  tasks,
  reviewMode,
  onApprove,
  onReject,
  onPlanChange,
  onQuestionsAnswered,
}: {
  columnId: string;
  tasks: Task[];
  reviewMode: "manual" | "auto";
  onApprove?: (taskId: string, plan: string, answers: string[]) => void;
  onReject?: (taskId: string) => void;
  onPlanChange?: (taskId: string, plan: string) => void;
  onQuestionsAnswered?: (taskId: string, answers: string[]) => void;
}) {
  return tasks.map((task) => (
    <TaskCard
      asHandle
      draggable={columnId === "queue"}
      key={task.id}
      onApprove={onApprove}
      onPlanChange={onPlanChange}
      onQuestionsAnswered={onQuestionsAnswered}
      onReject={onReject}
      reviewMode={columnId === "approve" ? reviewMode : "auto"}
      showApprovalControls={columnId === "approve"}
      showDone={columnId === "done"}
      showOutput={columnId === "in_progress"}
      showPlay={columnId === "queue"}
      task={task}
    />
  ));
}

function KanbanColumnRenderer({
  columnId,
  tasks,
  reviewMode,
  onReviewModeChange,
  onApprove,
  onReject,
  onPlanChange,
  onQuestionsAnswered,
}: {
  columnId: string;
  tasks: Task[];
  reviewMode: "manual" | "auto";
  onReviewModeChange: (mode: "manual" | "auto") => void;
  onApprove?: (taskId: string, plan: string, answers: string[]) => void;
  onReject?: (taskId: string) => void;
  onPlanChange?: (taskId: string, plan: string) => void;
  onQuestionsAnswered?: (taskId: string, answers: string[]) => void;
}) {
  const col = COLUMNS[columnId];
  const isQueue = columnId === "queue";

  return (
    <ResizablePanel
      className="flex min-w-0 flex-col"
      defaultSize={25}
      minSize={15}
    >
      <div className="flex h-full min-w-0 flex-col p-1.5">
        <KanbanColumn value={columnId}>
          <div className="relative flex h-full min-w-0 flex-col gap-2.5 overflow-hidden rounded-sm border border-white/[0.04] bg-white/[0.015] p-3">
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-0 right-3 left-3 h-px rounded-full opacity-70",
                col.accent
              )}
            />
            <ColumnHeader
              columnId={columnId}
              onReviewModeChange={onReviewModeChange}
              reviewMode={reviewMode}
              tasks={tasks}
            />

            {isQueue && (
              <button
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xs px-3 py-2.5",
                  "bg-white font-semibold text-[0.8rem] text-black",
                  "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_2px_12px_rgba(255,255,255,0.08)]",
                  "transition-all duration-150",
                  "hover:bg-white/93 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(255,255,255,0.15)]",
                  "active:scale-[0.98] active:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_1px_6px_rgba(255,255,255,0.1)]"
                )}
                onClick={() => {
                  document.getElementById("chorus-prompt-input")?.focus();
                }}
                type="button"
              >
                <PlusIcon className="size-3.5 shrink-0" />
                Create Task
              </button>
            )}

            <KanbanColumnContent
              className="nowheel custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 pb-1"
              value={columnId}
            >
              {tasks.length === 0 ? (
                <ColumnEmptyState
                  headline={col.emptyHeadline}
                  hint={col.emptyHint}
                  icon={col.emptyIcon}
                />
              ) : (
                <TaskList
                  columnId={columnId}
                  onApprove={onApprove}
                  onPlanChange={onPlanChange}
                  onQuestionsAnswered={onQuestionsAnswered}
                  onReject={onReject}
                  reviewMode={reviewMode}
                  tasks={tasks}
                />
              )}
            </KanbanColumnContent>
          </div>
        </KanbanColumn>
      </div>
    </ResizablePanel>
  );
}

export function KanbanCardContent({
  data,
  onColumnsChange,
  onReviewModeChange,
  onApprove,
  onReject,
  onPlanChange,
  onQuestionsAnswered,
}: {
  data: KanbanCardData;
  onColumnsChange: (columns: Columns) => void;
  onReviewModeChange?: (mode: "manual" | "auto") => void;
  onApprove?: (taskId: string, plan: string, answers: string[]) => void;
  onReject?: (taskId: string) => void;
  onPlanChange?: (taskId: string, plan: string) => void;
  onQuestionsAnswered?: (taskId: string, answers: string[]) => void;
}) {
  const [reviewMode, setReviewMode] = useState<"manual" | "auto">(
    data.reviewMode ?? "auto"
  );

  const handleReviewModeChange = (mode: "manual" | "auto") => {
    setReviewMode(mode);
    onReviewModeChange?.(mode);
  };

  return (
    <Kanban
      getItemValue={(item) => item.id}
      id={data.id}
      onValueChange={onColumnsChange}
      value={data.columns}
    >
      <KanbanBoard className="flex h-full min-h-0 w-full min-w-0">
        <ResizablePanelGroup
          className="relative w-full flex-1"
          direction="horizontal"
        >
          {Object.entries(data.columns).map(([columnId, tasks], index, arr) => (
            <Fragment key={columnId}>
              <KanbanColumnRenderer
                columnId={columnId}
                onApprove={onApprove}
                onPlanChange={onPlanChange}
                onQuestionsAnswered={onQuestionsAnswered}
                onReject={onReject}
                onReviewModeChange={handleReviewModeChange}
                reviewMode={reviewMode}
                tasks={tasks}
              />
              {index < arr.length - 1 && <ResizableHandle withHandle />}
            </Fragment>
          ))}
        </ResizablePanelGroup>
      </KanbanBoard>
    </Kanban>
  );
}

export { defaultColumns };
