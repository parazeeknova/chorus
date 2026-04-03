"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { memo, useCallback } from "react";

import {
  KanbanCardContent,
  type KanbanCardData,
} from "@/features/kanban/components/kanban";
import { cn } from "@/lib/utils";

export const KANBAN_CARD_NODE_TYPE = "kanbanCard";

export interface KanbanCardNodeData {
  columns: KanbanCardData["columns"];
  id: string;
  onRemove?: (id: string) => void;
  onUpdateColumns?: (id: string, columns: KanbanCardData["columns"]) => void;
  title: string;
  [key: string]: unknown;
}

function KanbanCardNodeComponent({
  data: rawData,
  id,
}: NodeProps<Node<Record<string, unknown>>>) {
  const cardData = rawData as unknown as KanbanCardNodeData;

  const handleColumnsChange = useCallback(
    (columns: KanbanCardData["columns"]) => {
      cardData.onUpdateColumns?.(id, columns);
    },
    [cardData, id]
  );

  return (
    <div
      className={cn(
        "dark w-[720px] rounded-2xl border border-white/10 bg-[#111111]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-shadow",
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

      <div className="flex items-center gap-2 border-white/8 border-b px-4 py-3">
        <div className="flex cursor-grab items-center justify-center rounded-md p-1 text-white/40 hover:text-white/60 active:cursor-grabbing">
          <GripVerticalIcon className="size-4" />
        </div>
        <h2 className="flex-1 font-medium text-[0.85rem] text-white tracking-wide">
          {cardData.title}
        </h2>
        {cardData.onRemove && (
          <button
            className="rounded-md p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
            onClick={() => cardData.onRemove?.(id)}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        )}
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
