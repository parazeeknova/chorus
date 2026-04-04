"use client";

import { BorderlessFileView, DiffFloatingWindow } from "@chorus/monaco";
import type { Node, NodeProps } from "@xyflow/react";
import {
  ChevronDownIcon,
  Code2Icon,
  GitBranchIcon,
  GlobeIcon,
  GripVerticalIcon,
  LoaderCircleIcon,
  MonitorIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
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
  boardId: string;
  columns: KanbanCardData["columns"];
  filePath?: string;
  gitBranch?: string;
  onRemove?: (id: string) => void;
  onUpdateColumns?: (id: string, columns: KanbanCardData["columns"]) => void;
  projectName?: string;
  sessionId?: string;
  sessionState: "uninitialized" | "starting" | "active" | "error";
  title: string;
  [key: string]: unknown;
}

const kanbanHeaderControlClass =
  "flex h-6 items-center rounded-xs font-medium text-[0.65rem] leading-none";

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
    <span className="flex items-center gap-1 rounded-xs border border-white/8 bg-white/5 px-1.5 py-0.5">
      <GitBranchIcon className="size-2.5 text-white/40" />
      <span className="font-mono text-[0.65rem] text-white/50 leading-none">
        {branch}
      </span>
    </span>
  );
}

function SessionStatus({
  sessionId,
  state,
}: {
  sessionId?: string;
  state: KanbanCardNodeData["sessionState"];
}) {
  if (state === "starting") {
    return (
      <span
        className={cn(
          kanbanHeaderControlClass,
          "gap-1 border border-cyan-400/20 bg-cyan-400/10 px-2"
        )}
      >
        <LoaderCircleIcon className="size-3 animate-spin text-cyan-300/80" />
        <span className="font-medium text-[0.65rem] text-cyan-200/80 leading-none">
          Starting
        </span>
      </span>
    );
  }

  if (state === "error") {
    return (
      <span
        className={cn(
          kanbanHeaderControlClass,
          "gap-1 border border-red-400/20 bg-red-400/10 px-2"
        )}
      >
        <TriangleAlertIcon className="size-3 text-red-300/80" />
        <span className="font-medium text-[0.65rem] text-red-200/80 leading-none">
          Error
        </span>
      </span>
    );
  }

  if (state === "active") {
    return (
      <span
        className={cn(
          kanbanHeaderControlClass,
          "gap-1 border border-emerald-400/20 bg-emerald-400/10 px-2"
        )}
      >
        <span className="size-1.5 rounded-full bg-emerald-300/90" />
        <span className="font-medium text-[0.65rem] text-emerald-200/80 leading-none">
          {sessionId ? "Live" : "Ready"}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        kanbanHeaderControlClass,
        "gap-1 border border-white/8 bg-white/5 px-2"
      )}
    >
      <span className="size-1.5 rounded-full bg-white/35" />
      <span className="font-medium text-[0.65rem] text-white/55 leading-none">
        Ready
      </span>
    </span>
  );
}

function inferLanguage(path?: string): string {
  if (!path) {
    return "plaintext";
  }
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    java: "java",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sh: "shell",
    bash: "shell",
    toml: "toml",
    xml: "xml",
    sql: "sql",
  };
  return ext ? (langMap[ext] ?? "plaintext") : "plaintext";
}

function KanbanCardNodeComponent({
  data: rawData,
  draggable,
  id,
  selected,
}: NodeProps<Node<Record<string, unknown>>>) {
  const cardData = rawData as unknown as KanbanCardNodeData;
  const [editorMode, setEditorMode] = useState<"kanban" | "file" | null>(null);
  const [diffVisible, setDiffVisible] = useState(false);
  const filePath = cardData.filePath ?? cardData.projectName ?? cardData.title;

  const handleColumnsChange = useCallback(
    (columns: KanbanCardData["columns"]) => {
      cardData.onUpdateColumns?.(id, columns);
    },
    [cardData, id]
  );

  const handleOpenHere = useCallback(() => {
    setEditorMode("file");
  }, []);

  const handleOpenLocally = useCallback(() => {
    setEditorMode("kanban");
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorMode(null);
  }, []);

  const handleToggleDiff = useCallback(() => {
    setDiffVisible((prev) => !prev);
  }, []);

  return (
    <>
      <div
        className={cn(
          "dark flex h-full w-full flex-col overflow-hidden rounded-sm border border-white/10 bg-[#111111]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-[box-shadow,border-color,background-color] duration-500",
          selected
            ? "border-white/16 shadow-[0_32px_100px_rgba(0,0,0,0.74)]"
            : "active:shadow-[0_32px_100px_rgba(0,0,0,0.8)] active:ring-1 active:ring-white/15"
        )}
      >
        <div className="flex items-center gap-3 border-white/8 border-b px-3 py-2.5">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xs p-1 transition-colors",
              draggable
                ? "cursor-grab text-white/25 hover:text-white/50 active:cursor-grabbing"
                : "cursor-default text-white/18"
            )}
          >
            <GripVerticalIcon className="size-3.5" />
          </div>

          <h2 className="shrink-0 font-semibold text-[0.82rem] text-white/90 tracking-wide">
            {cardData.title}
          </h2>

          <span className="h-3.5 w-px shrink-0 bg-white/10" />

          <div className="min-w-0 flex-1 truncate">
            <FilePath path={filePath} />
          </div>

          <div className="nodrag flex shrink-0 items-center gap-2.5">
            {cardData.gitBranch ? (
              <GitBranch branch={cardData.gitBranch} />
            ) : null}

            <span className="h-3.5 w-px bg-white/10" />

            <SessionStatus
              sessionId={cardData.sessionId}
              state={cardData.sessionState}
            />

            <span className="h-3.5 w-px bg-white/10" />

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  kanbanHeaderControlClass,
                  "gap-1.5 bg-white/15 px-2 text-white transition-all hover:bg-white/25 active:scale-95"
                )}
              >
                <Code2Icon className="size-3" />
                <span>Open in Editor</span>
                <ChevronDownIcon className="size-3 text-white/50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 border-white/10 bg-[#1e1e1e] p-1.5 text-white/90 shadow-2xl"
              >
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-white/80 text-xs transition-colors focus:bg-white/10 focus:text-white"
                  onClick={handleOpenLocally}
                >
                  <MonitorIcon className="size-3.5" />
                  <span>Open Locally</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-white/80 text-xs transition-colors focus:bg-white/10 focus:text-white"
                  onClick={handleOpenHere}
                >
                  <GlobeIcon className="size-3.5" />
                  <span>Open Here</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-white/80 text-xs transition-colors focus:bg-white/10 focus:text-white"
                  onClick={handleToggleDiff}
                >
                  <Code2Icon className="size-3.5" />
                  <span>View Diffs</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {editorMode !== null && (
              <button
                className="rounded-xs bg-white/10 px-2 py-1 font-medium text-[0.65rem] text-white transition-all hover:bg-white/20 active:scale-95"
                onClick={handleCloseEditor}
                type="button"
              >
                Back to Kanban
              </button>
            )}

            {cardData.onRemove && (
              <>
                <span className="h-3.5 w-px bg-white/10" />
                <button
                  className="rounded-xs p-1 text-white/25 transition-colors hover:bg-white/8 hover:text-white/60"
                  onClick={() => cardData.onRemove?.(id)}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="nodrag flex min-h-0 min-w-0 flex-1 flex-col">
          {editorMode === "file" && filePath ? (
            <BorderlessFileView
              filePath={filePath}
              language={inferLanguage(filePath)}
              value={`// File: ${filePath}\n// Connect to LSP to see live content`}
            />
          ) : (
            <div className="min-h-0 min-w-0 flex-1 p-4">
              <KanbanCardContent
                data={{
                  id: cardData.boardId,
                  title: cardData.title,
                  columns: cardData.columns,
                }}
                onColumnsChange={handleColumnsChange}
              />
            </div>
          )}
        </div>
      </div>

      <DiffFloatingWindow
        language={inferLanguage(filePath)}
        modified={`// Modified version of ${filePath}`}
        onClose={() => setDiffVisible(false)}
        original={`// Original version of ${filePath}`}
        visible={diffVisible}
      />
    </>
  );
}

export const KanbanCardNode = memo(KanbanCardNodeComponent);
