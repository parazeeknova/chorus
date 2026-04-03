"use client";

import { type Node, type NodeProps, NodeResizeControl } from "@xyflow/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  Code2Icon,
  GitBranchIcon,
  GlobeIcon,
  GripVerticalIcon,
  MinusIcon,
  MonitorIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KanbanCardContent,
  type KanbanCardData,
} from "@/features/kanban/components/kanban";
import { cn } from "@/lib/utils";

export const KANBAN_CARD_NODE_TYPE = "kanbanCard";

export interface KanbanCardNodeData {
  columns: KanbanCardData["columns"];
  diffAdded?: number;
  diffRemoved?: number;
  // Future linkable fields
  filePath?: string;
  gitBranch?: string;
  id: string;
  incomingChanges?: number;
  onRemove?: (id: string) => void;
  onUpdateColumns?: (id: string, columns: KanbanCardData["columns"]) => void;
  outgoingChanges?: number;
  title: string;
  [key: string]: unknown;
}

// Placeholder data — will be replaced with real agent/session data
const PLACEHOLDER: Required<
  Pick<
    KanbanCardNodeData,
    | "filePath"
    | "gitBranch"
    | "diffAdded"
    | "diffRemoved"
    | "incomingChanges"
    | "outgoingChanges"
  >
> = {
  filePath: "apps/web/src/features/kanban",
  gitBranch: "feat/kanban-board",
  diffAdded: 42,
  diffRemoved: 7,
  incomingChanges: 3,
  outgoingChanges: 5,
};

function FilePath({ path }: { path: string }) {
  const parts = path.split("/");
  const filename = parts.pop();
  const dir = parts.join("/");
  return (
    <span className="flex items-center gap-0.5 font-mono text-[0.7rem] leading-none">
      {dir && (
        <span className="text-white/30">
          {dir}
          <span className="mx-0.5 text-white/20">/</span>
        </span>
      )}
      <span className="text-white/60">{filename}</span>
    </span>
  );
}

function GitBranch({ branch }: { branch: string }) {
  return (
    <span className="flex items-center gap-1 rounded-md border border-white/8 bg-white/5 px-1.5 py-0.5">
      <GitBranchIcon className="size-2.5 text-white/40" />
      <span className="font-mono text-[0.65rem] text-white/50 leading-none">
        {branch}
      </span>
    </span>
  );
}

function DiffStat({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5 font-medium text-[0.65rem] text-emerald-400/80 leading-none">
        <PlusIcon className="size-2.5" />
        {added}
      </span>
      <span className="text-white/15">·</span>
      <span className="flex items-center gap-0.5 font-medium text-[0.65rem] text-red-400/70 leading-none">
        <MinusIcon className="size-2.5" />
        {removed}
      </span>
    </span>
  );
}

function SyncStat({
  incoming,
  outgoing,
}: {
  incoming: number;
  outgoing: number;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="flex items-center gap-0.5 font-medium text-[0.65rem] text-sky-400/70 leading-none"
        title={`${incoming} incoming commits`}
      >
        <ArrowDownIcon className="size-2.5" />
        {incoming}
      </span>
      <span className="text-white/15">·</span>
      <span
        className="flex items-center gap-0.5 font-medium text-[0.65rem] text-violet-400/70 leading-none"
        title={`${outgoing} outgoing commits`}
      >
        <ArrowUpIcon className="size-2.5" />
        {outgoing}
      </span>
    </span>
  );
}

function KanbanCardNodeComponent({
  data: rawData,
  id,
  selected,
}: NodeProps<Node<Record<string, unknown>>>) {
  const cardData = rawData as unknown as KanbanCardNodeData;

  const filePath = cardData.filePath ?? PLACEHOLDER.filePath;
  const gitBranch = cardData.gitBranch ?? PLACEHOLDER.gitBranch;
  const diffAdded = cardData.diffAdded ?? PLACEHOLDER.diffAdded;
  const diffRemoved = cardData.diffRemoved ?? PLACEHOLDER.diffRemoved;
  const incomingChanges =
    cardData.incomingChanges ?? PLACEHOLDER.incomingChanges;
  const outgoingChanges =
    cardData.outgoingChanges ?? PLACEHOLDER.outgoingChanges;

  const handleColumnsChange = useCallback(
    (columns: KanbanCardData["columns"]) => {
      cardData.onUpdateColumns?.(id, columns);
    },
    [cardData, id]
  );

  return (
    <>
      {selected && (
        <>
          <NodeResizeControl
            className="-left-1.5! h-full! w-3! border-0! bg-transparent!"
            minWidth={800}
            position="left"
          />
          <NodeResizeControl
            className="-right-1.5! h-full! w-3! border-0! bg-transparent!"
            minWidth={800}
            position="right"
          />
        </>
      )}
      <div
        className={cn(
          "dark flex h-full w-full flex-col rounded-2xl border border-white/10 bg-[#111111]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-shadow",
          "active:shadow-[0_32px_100px_rgba(0,0,0,0.8)] active:ring-1 active:ring-white/15"
        )}
      >
        {/* Title bar */}
        <div className="flex items-center gap-3 border-white/8 border-b px-3 py-2.5">
          {/* Drag handle */}
          <div className="flex shrink-0 cursor-grab items-center justify-center rounded-md p-1 text-white/25 hover:text-white/50 active:cursor-grabbing">
            <GripVerticalIcon className="size-3.5" />
          </div>

          {/* Left: Task name */}
          <h2 className="shrink-0 font-semibold text-[0.82rem] text-white/90 tracking-wide">
            {cardData.title}
          </h2>

          {/* Separator */}
          <span className="h-3.5 w-px shrink-0 bg-white/10" />

          {/* File path */}
          <div className="min-w-0 flex-1 truncate">
            <FilePath path={filePath} />
          </div>

          {/* Right-aligned metadata */}
          <div className="nodrag flex shrink-0 items-center gap-2.5">
            <GitBranch branch={gitBranch} />

            {/* Separator */}
            <span className="h-3.5 w-px bg-white/10" />

            <DiffStat added={diffAdded} removed={diffRemoved} />

            {/* Separator */}
            <span className="h-3.5 w-px bg-white/10" />

            <SyncStat incoming={incomingChanges} outgoing={outgoingChanges} />

            {/* Separator */}
            <span className="h-3.5 w-px bg-white/10" />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 font-medium text-[0.65rem] text-white transition-all hover:bg-white/25 active:scale-95">
                <Code2Icon className="size-3" />
                <span>Open in Editor</span>
                <ChevronDownIcon className="size-3 text-white/50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[160px] border-white/10 bg-[#1e1e1e] p-1.5 text-white/90 shadow-2xl"
              >
                <DropdownMenuItem className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-white/80 text-xs transition-colors focus:bg-white/10 focus:text-white">
                  <MonitorIcon className="size-3.5" />
                  <span>Open Locally</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-white/80 text-xs transition-colors focus:bg-white/10 focus:text-white">
                  <GlobeIcon className="size-3.5" />
                  <span>Open Here</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close */}
            {cardData.onRemove && (
              <>
                <span className="h-3.5 w-px bg-white/10" />
                <button
                  className="rounded-md p-1 text-white/25 transition-colors hover:bg-white/8 hover:text-white/60"
                  onClick={() => cardData.onRemove?.(id)}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="nodrag flex min-h-0 min-w-0 flex-1 flex-col p-4">
          <KanbanCardContent
            data={cardData}
            onColumnsChange={handleColumnsChange}
          />
        </div>
      </div>
    </>
  );
}

export const KanbanCardNode = memo(KanbanCardNodeComponent);
