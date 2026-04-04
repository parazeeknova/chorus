"use client";

import { BorderlessFileView, InlineDiffView } from "@chorus/monaco";
import {
  BrainIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  FilePenLineIcon,
  Loader2Icon,
  MessageSquareIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { type GroupedStep, groupSteps } from "../utils/group-steps";

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
  modifiedContent?: string;
  originalContent?: string;
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
      originalContent:
        "// Original file content here\n// This will be replaced by the diff editor",
      modifiedContent:
        "// New file content here\n// With cursor tracking logic added",
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

function GroupedThinkingBlock({
  group,
}: {
  group: NonNullable<Extract<GroupedStep, { kind: "thinking" }>>;
}) {
  const isRunning = group.status === "running";
  const [expanded, setExpanded] = useState(false);
  const hasContent = group.content && group.content.length > 0;
  const stepCount = group.sourceSteps.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-violet-400/60" />
        ) : (
          <CheckCircle2Icon className="size-3 shrink-0 text-white/20" />
        )}

        <BrainIcon className="size-3 shrink-0 text-violet-400" />
        <span className="font-medium text-[0.65rem] text-violet-400 uppercase tracking-wider">
          Thinking
        </span>

        {stepCount > 1 && (
          <span className="rounded-xs bg-violet-500/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-violet-300/70">
            {stepCount}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-white/60">
          {group.summary}
        </span>

        {hasContent && (
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

      {expanded && hasContent && (
        <div className="ml-5 rounded-xs border border-violet-500/10 bg-violet-500/[0.03] px-3 py-2.5">
          <div className="text-[0.72rem] text-violet-300/60 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {group.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupedResponseBlock({
  group,
}: {
  group: {
    kind: "response";
    id: string;
    status: AgentStep["status"];
    summary: string;
    content: string;
    sourceSteps: AgentStep[];
  };
}) {
  const isRunning = group.status === "running";
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasContent = group.content && group.content.length > 0;
  const stepCount = group.sourceSteps.length;

  function handleCopy() {
    if (group.content) {
      navigator.clipboard.writeText(group.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-sky-400/60" />
        ) : (
          <CheckCircle2Icon className="size-3 shrink-0 text-white/20" />
        )}

        <MessageSquareIcon className="size-3 shrink-0 text-sky-400" />
        <span className="font-medium text-[0.65rem] text-sky-400 uppercase tracking-wider">
          Response
        </span>

        {stepCount > 1 && (
          <span className="rounded-xs bg-sky-500/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-sky-300/70">
            {stepCount}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-white/60">
          {group.summary}
        </span>

        {hasContent && (
          <>
            <button
              className="shrink-0 rounded-xs p-0.5 transition-colors hover:bg-white/10"
              onClick={handleCopy}
              type="button"
            >
              <CopyIcon
                className={cn(
                  "size-3",
                  copied ? "text-emerald-400" : "text-white/30"
                )}
              />
            </button>
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
          </>
        )}
      </div>

      {expanded && hasContent && (
        <div className="ml-5 rounded-xs border border-sky-500/10 bg-sky-500/[0.03] px-3 py-2.5">
          <div className="text-[0.72rem] text-sky-300/70 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {group.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangesBlock({ step }: { step: AgentStep }) {
  const isRunning = step.status === "running";
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const hasOriginal = step.originalContent && step.originalContent.length > 0;
  const hasModified = step.modifiedContent && step.modifiedContent.length > 0;
  const hasActualChanges =
    (step.linesAdded ?? 0) > 0 || (step.linesRemoved ?? 0) > 0;
  const canShowDiff = hasOriginal && hasModified && hasActualChanges;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-emerald-400/60" />
        ) : (
          <CheckCircle2Icon className="size-3 shrink-0 text-white/20" />
        )}

        <FilePenLineIcon className="size-3 shrink-0 text-emerald-400" />
        <span className="font-medium text-[0.65rem] text-emerald-400 uppercase tracking-wider">
          Edit
        </span>

        <span className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-white/60">
          {step.summary}
        </span>

        <span className="flex shrink-0 items-center gap-1.5 text-[0.65rem]">
          {step.linesAdded !== undefined && step.linesAdded > 0 && (
            <span className="text-emerald-400/80">+{step.linesAdded}</span>
          )}
          {step.linesRemoved !== undefined && step.linesRemoved > 0 && (
            <span className="text-red-400/70">-{step.linesRemoved}</span>
          )}
        </span>

        {canShowDiff && (
          <button
            className={cn(
              "shrink-0 rounded-xs px-1.5 py-0.5 font-medium text-[0.6rem] transition-colors",
              showDiff
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-white/30 hover:bg-white/10 hover:text-white/50"
            )}
            onClick={() => setShowDiff(!showDiff)}
            type="button"
          >
            {showDiff ? "Hide Diff" : "Diff"}
          </button>
        )}

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
      </div>

      {expanded && step.filePath && (
        <div className="ml-5 overflow-hidden rounded-xs border border-white/5 bg-[#0d0d0d]">
          {showDiff &&
          canShowDiff &&
          step.originalContent &&
          step.modifiedContent ? (
            <InlineDiffView
              language={inferLanguage(step.filePath)}
              modified={step.modifiedContent}
              original={step.originalContent}
            />
          ) : (
            <BorderlessFileView
              filePath={step.filePath}
              height="200px"
              language={inferLanguage(step.filePath)}
              value={
                step.modifiedContent ??
                step.content ??
                `// File: ${step.filePath}\n// Content will appear here once the agent provides it`
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function ToolCallRow({ step }: { step: AgentStep }) {
  const meta = STEP_META[step.kind];
  const Icon = meta.icon;
  const isRunning = step.status === "running";

  return (
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
    </div>
  );
}

function GroupedStepRow({ group }: { group: GroupedStep }) {
  switch (group.kind) {
    case "thinking":
      return <GroupedThinkingBlock group={group} />;
    case "response":
      return <GroupedResponseBlock group={group} />;
    case "file_edit":
      return <ChangesBlock step={group.step} />;
    case "tool_call":
    case "command":
      return <ToolCallRow step={group.step} />;
    default:
      return null;
  }
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
  const groupedSteps = groupSteps(run.steps);

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
        {groupedSteps.map((group) => {
          const stepId =
            group.kind === "thinking" || group.kind === "response"
              ? group.id
              : group.step.id;
          const uniqueKey =
            "sourceSteps" in group
              ? `${stepId}-${group.sourceSteps.length}-${group.sourceSteps[0]?.id}`
              : `${stepId}-${group.step.content?.slice(0, 50)}`;
          return <GroupedStepRow group={group} key={uniqueKey} />;
        })}
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
