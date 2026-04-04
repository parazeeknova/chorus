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
  AlertCircle,
  CheckIcon,
  CircleCheckIcon,
  CircleDot,
  CircleIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
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
  PLACEHOLDER_RUN,
} from "@/features/kanban/components/agent-output-card";
import { cn } from "@/lib/utils";

export interface Task {
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
  /** Links to an OpenCode sessionId for live agent output */
  runId?: string;
  /** Short paragraph describing what the agent did — shown in done cards */
  summary?: string;
  title: string;
}

export type Columns = Record<string, Task[]>;

export interface KanbanCardData {
  columns: Columns;
  id: string;
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
  "inline-flex items-center rounded-full font-medium text-xs transition-colors",
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
                    <div className="rounded-lg border border-border/50 bg-card p-3 text-[14px] shadow-xl dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-2xl">
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

const COLUMNS: Record<string, { title: string; icon: React.ReactNode }> = {
  queue: {
    title: "Queue",
    icon: <CircleIcon className="size-3.5" />,
  },
  in_progress: {
    title: "In Progress",
    icon: <CircleDot className="size-3.5 text-muted-foreground" />,
  },
  approve: {
    title: "Review",
    icon: <AlertCircle className="size-3.5 text-amber-500" />,
  },
  done: {
    title: "Done",
    icon: <CircleCheckIcon className="size-3.5 text-emerald-500" />,
  },
};

interface TaskCardProps {
  asHandle?: boolean;
  draggable?: boolean;
  showApprovalControls?: boolean;
  showDone?: boolean;
  showOutput?: boolean;
  showPlay?: boolean;
  task: Task;
}

function TaskCard({
  task,
  asHandle,
  draggable,
  showOutput,
  showDone,
  showApprovalControls,
  showPlay,
}: TaskCardProps) {
  const content = (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-3.5 shadow-sm transition-all hover:border-border hover:shadow-md dark:border-white/10 dark:bg-white/3 dark:hover:border-white/20 dark:hover:bg-white/6">
      <span className="font-medium text-[0.85rem] text-foreground leading-snug dark:text-white/90">
        {task.title}
      </span>

      {/* Done: summary + diff stats */}
      {showDone && (
        <div className="flex flex-col gap-2 border-white/5 border-t pt-2.5">
          {task.summary && (
            <p className="text-[0.72rem] text-white/40 leading-relaxed">
              {task.summary}
            </p>
          )}
          {(task.linesAdded !== undefined ||
            task.linesRemoved !== undefined) && (
            <div className="flex items-center gap-2">
              {task.linesAdded !== undefined && task.linesAdded > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[0.65rem] text-emerald-400/70">
                  +{task.linesAdded}
                </span>
              )}
              {task.linesAdded !== undefined &&
                task.linesAdded > 0 &&
                task.linesRemoved !== undefined &&
                task.linesRemoved > 0 && (
                  <span className="text-[0.65rem] text-white/15">·</span>
                )}
              {task.linesRemoved !== undefined && task.linesRemoved > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[0.65rem] text-red-400/60">
                  -{task.linesRemoved}
                </span>
              )}
              <span className="text-[0.65rem] text-white/20">
                lines changed
              </span>
            </div>
          )}
        </div>
      )}

      {showPlay && (
        <div className="flex items-center justify-end pt-1">
          <button
            className="flex items-center gap-1.5 rounded-md bg-white/8 px-2.5 py-1.5 font-medium text-[0.7rem] text-white/60 transition-all hover:bg-emerald-500/15 hover:text-emerald-400 active:scale-95"
            title="Run task"
            type="button"
          >
            <PlayIcon className="size-3 fill-current" />
            Run
          </button>
        </div>
      )}

      {showApprovalControls && (
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 transition-colors hover:bg-emerald-500/20 active:scale-95"
            title="Approve"
            type="button"
          >
            <CheckIcon className="size-4" />
          </button>
          <button
            className="flex size-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20 active:scale-95"
            title="Reject"
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {showDone && (
        <div className="flex items-center justify-end pt-1">
          <button
            className="flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 font-medium text-[0.7rem] text-white/35 transition-all hover:bg-white/10 hover:text-white/60 active:scale-95"
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
        // In-progress: task card + vertical connector + agent output card
        <>
          {contentNode}
          {/* Connector: vertical line linking task to output */}
          <div className="flex">
            <div className="ml-4 flex flex-col items-center">
              <div className="h-3 w-px bg-white/10" />
              <div className="size-1.5 rounded-full bg-white/20" />
              <div className="h-1.5 w-px bg-white/10" />
            </div>
          </div>
          <AgentOutputCard
            run={{
              ...PLACEHOLDER_RUN,
              taskTitle: task.title,
            }}
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
      },
      {
        id: `${boardId}-queue-landing-page`,
        title:
          "Design a dark-mode landing page with hero section and pricing table",
        label: "Design",
        labelVariant: "info-light",
      },
      {
        id: `${boardId}-queue-cicd`,
        title:
          "Set up GitHub Actions CI/CD pipeline with Turbo cache and preview deploys",
        label: "DevOps",
        labelVariant: "warning-light",
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

export function KanbanCardContent({
  data,
  onColumnsChange,
}: {
  data: KanbanCardData;
  onColumnsChange: (columns: Columns) => void;
}) {
  const [autoAccept, setAutoAccept] = useState(false);

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
          {Object.entries(data.columns).map(([columnId, tasks], index, arr) => {
            const col = COLUMNS[columnId];
            const isQueue = columnId === "queue";
            const isReview = columnId === "approve";
            return (
              <Fragment key={columnId}>
                <ResizablePanel
                  className="flex min-w-0 flex-col"
                  defaultSize={25}
                  minSize={15}
                >
                  <div className="flex h-full min-w-0 flex-col px-1.5">
                    <KanbanColumn value={columnId}>
                      <div className="flex h-full min-w-0 flex-col gap-3 rounded-xl border border-transparent bg-muted/30 p-3 dark:border-white/2 dark:bg-black/30">
                        {/* Column header */}
                        <div className="flex items-center gap-2 px-1 py-1">
                          {col.icon}
                          <h3 className="truncate font-medium text-[0.75rem] text-muted-foreground uppercase tracking-wider dark:text-white/50">
                            {col.title}
                          </h3>
                          {isReview ? (
                            <div className="ml-auto flex items-center gap-2">
                              <button
                                className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/5"
                                onClick={() => setAutoAccept((v) => !v)}
                                title={
                                  autoAccept
                                    ? "Switch to manual review"
                                    : "Switch to auto-accept"
                                }
                                type="button"
                              >
                                <span
                                  className={`font-medium text-[0.6rem] uppercase tracking-wider transition-colors ${
                                    autoAccept
                                      ? "text-emerald-400"
                                      : "text-white/30"
                                  }`}
                                >
                                  {autoAccept ? "Auto" : "Manual"}
                                </span>
                                <span
                                  className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-all ${
                                    autoAccept
                                      ? "bg-emerald-500/40"
                                      : "bg-white/10"
                                  }`}
                                >
                                  <span
                                    className={`absolute size-2.5 rounded-full transition-all ${
                                      autoAccept
                                        ? "left-[calc(100%-2px)] -translate-x-full bg-emerald-400"
                                        : "left-[2px] bg-white/40"
                                    }`}
                                  />
                                </span>
                              </button>
                              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background font-semibold text-[10px] dark:bg-white/10 dark:text-white/80">
                                {tasks.length}
                              </div>
                            </div>
                          ) : (
                            <div className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-background font-semibold text-[10px] dark:bg-white/10 dark:text-white/80">
                              {tasks.length}
                            </div>
                          )}
                        </div>

                        {/* Queue: create task button */}
                        {isQueue && (
                          <button
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 font-semibold text-[0.8rem] text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                            type="button"
                          >
                            <PlusIcon className="size-4 shrink-0" />
                            Create Task
                          </button>
                        )}

                        <KanbanColumnContent
                          className="nowheel custom-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 pb-1"
                          value={columnId}
                        >
                          {tasks.map((task) => (
                            <TaskCard
                              asHandle
                              draggable={columnId === "queue"}
                              key={task.id}
                              showApprovalControls={
                                columnId === "approve" && !autoAccept
                              }
                              showDone={columnId === "done"}
                              showOutput={columnId === "in_progress"}
                              showPlay={columnId === "queue"}
                              task={task}
                            />
                          ))}
                        </KanbanColumnContent>
                      </div>
                    </KanbanColumn>
                  </div>
                </ResizablePanel>
                {index < arr.length - 1 && <ResizableHandle withHandle />}
              </Fragment>
            );
          })}
        </ResizablePanelGroup>
      </KanbanBoard>
    </Kanban>
  );
}

export { defaultColumns };
