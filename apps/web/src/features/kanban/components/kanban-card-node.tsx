"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GitBranchIcon,
  GripVerticalIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback } from "react";

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
    <div
      className={cn(
        "dark w-[960px] rounded-2xl border border-white/10 bg-[#111111]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-shadow",
        "active:shadow-[0_32px_100px_rgba(0,0,0,0.8)] active:ring-1 active:ring-white/15"
      )}
    >
      <Handle
        className="!w-3 !h-3 !bg-white/30 !border-white/20"
        position={Position.Top}
        type="target"
      />
      <Handle
        className="!w-3 !h-3 !bg-white/30 !border-white/20"
        position={Position.Bottom}
        type="source"
      />

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
        <div className="flex shrink-0 items-center gap-2.5">
          <GitBranch branch={gitBranch} />

          {/* Separator */}
          <span className="h-3.5 w-px bg-white/10" />

          <DiffStat added={diffAdded} removed={diffRemoved} />

          {/* Separator */}
          <span className="h-3.5 w-px bg-white/10" />

          <SyncStat incoming={incomingChanges} outgoing={outgoingChanges} />

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

      <div className="nodrag p-4">
        <KanbanCardContent
          data={cardData}
          onColumnsChange={handleColumnsChange}
        />
      </div>
    </div>
  );
}

export const KanbanCardNode = memo(KanbanCardNodeComponent);
