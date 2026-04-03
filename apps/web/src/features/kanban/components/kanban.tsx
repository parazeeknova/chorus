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
  PlusIcon,
  XIcon,
} from "lucide-react";
import {
  type ComponentProps,
  createContext,
  Fragment,
  useCallback,
  useContext,
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
  /** Links to an OpenCode sessionId for live agent output */
  runId?: string;
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
  value,
  onValueChange,
  getItemValue,
  children,
}: {
  value: Columns;
  onValueChange: (columns: Columns) => void;
  getItemValue: (item: Task) => string;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    } else {
      const newActiveTasks = [...activeTasks];
      const [movedTask] = newActiveTasks.splice(activeIndex, 1);
      const newOverTasks = [...overTasks];
      newOverTasks.splice(overIndex, 0, movedTask);
      onValueChange({
        ...value,
        [activeColId]: newActiveTasks,
        [overColId]: newOverTasks,
      });
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
    } else {
      const newActiveTasks = [...activeTasks];
      const [movedTask] = newActiveTasks.splice(activeIndex, 1);
      const newOverTasks = [...overTasks];
      newOverTasks.splice(overIndex, 0, movedTask);
      onValueChange({
        ...value,
        [activeColId]: newActiveTasks,
        [overColId]: newOverTasks,
      });
    }
  }

  return (
    <KanbanContext.Provider
      value={{ value, onValueChange, getItemValue, activeId }}
    >
      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {children}
        {typeof document === "undefined"
          ? null
          : createPortal(
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
            )}
      </DndContext>
    </KanbanContext.Provider>
  );
}

function KanbanBoard({ className, children }: ComponentProps<"div">) {
  return <div className={cn("grid gap-3", className)}>{children}</div>;
}

function KanbanColumn({
  value: columnId,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <div data-column={columnId}>{children}</div>;
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
      <div className={cn("min-h-[80px]", className)}>{children}</div>
    </SortableContext>
  );
}

function KanbanItem({
  value,
  children,
  className,
  ...props
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
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
      className={cn("cursor-grab active:cursor-grabbing", className)}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
    title: "Approve",
    icon: <AlertCircle className="size-3.5 text-amber-500" />,
  },
  done: {
    title: "Done",
    icon: <CircleCheckIcon className="size-3.5 text-emerald-500" />,
  },
};

interface TaskCardProps {
  asHandle?: boolean;
  showApprovalControls?: boolean;
  showOutput?: boolean;
  task: Task;
}

function TaskCard({
  task,
  asHandle,
  showOutput,
  showApprovalControls,
}: TaskCardProps) {
  const content = (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-3.5 shadow-sm transition-all hover:border-border hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]">
      <span className="font-medium text-[0.85rem] text-foreground leading-snug dark:text-white/90">
        {task.title}
      </span>
      <div className="flex items-center justify-between gap-2">
        <Badge className="w-fit" size="sm" variant={task.labelVariant}>
          {task.label}
        </Badge>
        {showApprovalControls && (
          <div className="flex items-center gap-1.5 pt-1">
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
      </div>
    </div>
  );

  const contentNode = asHandle ? (
    <KanbanItemHandle>{content}</KanbanItemHandle>
  ) : (
    content
  );

  return (
    <KanbanItem value={task.id}>
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

function defaultColumns(): Columns {
  return {
    queue: [
      {
        id: `${Date.now()}-1`,
        title:
          "Refactor the auth middleware to use JWT RS256 and add refresh token rotation",
        label: "Backend",
        labelVariant: "primary-light",
      },
      {
        id: `${Date.now()}-2`,
        title:
          "Design a dark-mode landing page with hero section and pricing table",
        label: "Design",
        labelVariant: "info-light",
      },
      {
        id: `${Date.now()}-3`,
        title:
          "Set up GitHub Actions CI/CD pipeline with Turbo cache and preview deploys",
        label: "DevOps",
        labelVariant: "warning-light",
      },
    ],
    in_progress: [
      {
        id: `${Date.now()}-4`,
        title:
          "Implement real-time collaborative cursor tracking via WebSocket",
        label: "Frontend",
        labelVariant: "primary-light",
      },
    ],
    approve: [],
    done: [
      {
        id: `${Date.now()}-5`,
        title:
          "Project kickoff — repo structure, monorepo config, base design system",
        label: "Planning",
        labelVariant: "info-light",
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
  return (
    <Kanban
      getItemValue={(item) => item.id}
      onValueChange={onColumnsChange}
      value={data.columns}
    >
      <KanbanBoard className="flex min-h-0 w-full min-w-0">
        <ResizablePanelGroup
          className="relative w-full flex-1"
          direction="horizontal"
        >
          {Object.entries(data.columns).map(([columnId, tasks], index, arr) => {
            const col = COLUMNS[columnId];
            const isQueue = columnId === "queue";
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
                          <div className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-background font-semibold text-[10px] dark:bg-white/10 dark:text-white/80">
                            {tasks.length}
                          </div>
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
                          className="flex min-h-20 flex-col gap-2.5"
                          value={columnId}
                        >
                          {tasks.map((task) => (
                            <TaskCard
                              asHandle
                              key={task.id}
                              showApprovalControls={columnId === "approve"}
                              showOutput={columnId === "in_progress"}
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
