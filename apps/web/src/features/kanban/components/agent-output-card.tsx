"use client";

import { BorderlessFileView } from "@chorus/monaco";
import {
  BrainIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  FilePenLineIcon,
  Loader2Icon,
  MessageSquareIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type AgentStepKind =
  | "thinking"
  | "response"
  | "file_edit"
  | "tool_call"
  | "command";

export type AgentStepStatus = "running" | "done" | "error";

export interface AgentStep {
  content?: string;
  filePath?: string;
  id: string;
  kind: AgentStepKind;
  linesAdded?: number;
  linesRemoved?: number;
  status: AgentStepStatus;
  summary: string;
}

export interface AgentRunContext {
  elapsed: string;
  model: string;
  sessionId?: string;
  startedAt?: number;
  steps: AgentStep[];
  taskTitle: string;
}

export const PLACEHOLDER_RUN: AgentRunContext = {
  sessionId: "session_placeholder_001",
  taskTitle: "Implement real-time collaborative cursor tracking via WebSocket",
  model: "claude-sonnet-4-5",
  elapsed: "2m 03s",
  steps: [
    {
      id: "step-1",
      kind: "thinking",
      status: "done",
      summary: "Planning WebSocket cursor broadcast architecture",
      content:
        "I'll implement a shared cursor state using a WebSocket server. Each client will broadcast cursor position on mousemove with debouncing, and receive cursor positions of all other connected clients. I'll use a Map<sessionId, {x, y, userId}> on the server to track state.",
    },
    {
      id: "step-2",
      kind: "tool_call",
      status: "done",
      summary: "read_file(apps/serve/src/ws/handler.ts)",
    },
    {
      id: "step-3",
      kind: "file_edit",
      status: "done",
      summary: "apps/serve/src/ws/cursor-handler.ts",
      filePath: "apps/serve/src/ws/cursor-handler.ts",
      linesAdded: 64,
      linesRemoved: 0,
    },
    {
      id: "step-4",
      kind: "file_edit",
      status: "done",
      summary: "apps/web/src/hooks/use-cursors.ts",
      filePath: "apps/web/src/hooks/use-cursors.ts",
      linesAdded: 38,
      linesRemoved: 5,
    },
    {
      id: "step-5",
      kind: "command",
      status: "done",
      summary: "bun run check-types",
      content: "Found 0 errors.",
    },
    {
      id: "step-6",
      kind: "response",
      status: "running",
      summary: "Writing implementation summary…",
      content:
        "I've implemented shared cursor tracking. The server broadcasts cursor positions via WebSocket, and the `useCursors` hook handles debounced emission and remote-cursor rendering. Types are clean.",
    },
  ],
};

const STEP_META: Record<
  AgentStepKind,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
  }
> = {
  thinking: { icon: BrainIcon, label: "Thinking", color: "text-violet-400" },
  response: {
    icon: MessageSquareIcon,
    label: "Response",
    color: "text-sky-400",
  },
  file_edit: {
    icon: FilePenLineIcon,
    label: "Edit",
    color: "text-emerald-400",
  },
  tool_call: { icon: WrenchIcon, label: "Tool", color: "text-amber-400" },
  command: { icon: TerminalIcon, label: "Run", color: "text-white/50" },
};

function inferLanguage(filePath?: string): string {
  if (!filePath) {
    return "plaintext";
  }
  const ext = filePath.split(".").pop()?.toLowerCase();
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

function StepRow({ step }: { step: AgentStep }) {
  const meta = STEP_META[step.kind];
  const Icon = meta.icon;
  const isRunning = step.status === "running";
  const [expanded, setExpanded] = useState(false);

  const showExpandable =
    step.kind === "file_edit" ||
    (step.content && (step.kind === "response" || step.kind === "thinking"));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-white/40" />
        ) : (
          <CheckCircle2Icon className="size-3 shrink-0 text-white/20" />
        )}

        <Icon className={cn("size-3 shrink-0", meta.color)} />
        <span
          className={cn(
            "font-medium text-[0.65rem] uppercase tracking-wider",
            meta.color
          )}
        >
          {meta.label}
        </span>

        <span className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-white/60">
          {step.summary}
        </span>

        {step.kind === "file_edit" && (
          <span className="flex shrink-0 items-center gap-1.5 text-[0.65rem]">
            {step.linesAdded !== undefined && step.linesAdded > 0 && (
              <span className="text-emerald-400/80">+{step.linesAdded}</span>
            )}
            {step.linesRemoved !== undefined && step.linesRemoved > 0 && (
              <span className="text-red-400/70">-{step.linesRemoved}</span>
            )}
          </span>
        )}

        {showExpandable && (
          <button
            className="shrink-0 rounded-xs p-0.5 transition-colors hover:bg-white/10"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? (
              <ChevronDownIcon className="size-3 text-white/30" />
            ) : (
              <ChevronRightIcon className="size-3 text-white/20" />
            )}
          </button>
        )}
      </div>

      {step.content &&
        (step.status === "running" ||
          step.kind === "response" ||
          step.kind === "thinking") && (
          <div className="ml-5 rounded-xs border border-white/5 bg-white/2 px-3 py-2">
            <p className="text-[0.72rem] text-white/50 leading-relaxed">
              {step.content}
            </p>
          </div>
        )}

      {expanded && step.kind === "file_edit" && step.filePath && (
        <div className="ml-5 overflow-hidden rounded-xs border border-white/5 bg-[#0d0d0d]">
          <BorderlessFileView
            filePath={step.filePath}
            height="200px"
            language={inferLanguage(step.filePath)}
            value={
              step.content ??
              `// File: ${step.filePath}\n// Content will appear here once the agent provides it`
            }
          />
        </div>
      )}
    </div>
  );
}

interface AgentOutputCardProps {
  accentClass?: string;
  className?: string;
  run: AgentRunContext;
}

export function AgentOutputCard({
  run,
  accentClass: _accentClass = "bg-primary-light",
  className,
}: AgentOutputCardProps) {
  const doneCount = run.steps.filter((s) => s.status === "done").length;
  const isLive = run.steps.some((s) => s.status === "running");

  return (
    <div
      className={cn(
        "flex flex-col gap-0 overflow-hidden rounded-sm border border-white/10 bg-white/2",
        className
      )}
    >
      <div className="flex items-center gap-2 border-white/8 border-b bg-white/1.5 px-3 py-2">
        <span className="relative flex size-2">
          {isLive && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-50" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              isLive ? "bg-sky-400" : "bg-white/20"
            )}
          />
        </span>

        <span className="min-w-0 flex-1 truncate font-medium text-[0.7rem] text-white/70">
          {run.taskTitle}
        </span>

        <span className="shrink-0 rounded-xs border border-white/8 bg-white/5 px-1.5 py-0.5 font-mono text-[0.6rem] text-white/40">
          {run.model}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        {run.steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>

      <div className="flex items-center gap-3 border-white/5 border-t px-3 py-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isLive ? "bg-sky-500" : "bg-white/30"
            )}
            style={{
              width: `${Math.round((doneCount / run.steps.length) * 100)}%`,
            }}
          />
        </div>
        <span className="shrink-0 text-[0.65rem] text-white/30 tabular-nums">
          {doneCount}/{run.steps.length} steps · {run.elapsed}
        </span>
      </div>
    </div>
  );
}
