"use client";

import {
  BrainIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FilePenLineIcon,
  Loader2Icon,
  MessageSquareIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react";
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

function StepRow({ step }: { step: AgentStep }) {
  const meta = STEP_META[step.kind];
  const Icon = meta.icon;
  const isRunning = step.status === "running";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {/* Status indicator */}
        {isRunning ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-white/40" />
        ) : (
          <CheckCircle2Icon className="size-3 shrink-0 text-white/20" />
        )}

        {/* Kind icon + label */}
        <Icon className={cn("size-3 shrink-0", meta.color)} />
        <span
          className={cn(
            "font-medium text-[0.65rem] uppercase tracking-wider",
            meta.color
          )}
        >
          {meta.label}
        </span>

        {/* Summary */}
        <span className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-white/60">
          {step.summary}
        </span>

        {/* Diff stats for file edits */}
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

        {/* Chevron for expandable content */}
        {step.content && (
          <ChevronRightIcon className="size-3 shrink-0 text-white/20" />
        )}
      </div>

      {/* Inline content for response/thinking (last step or running) */}
      {step.content &&
        (step.status === "running" ||
          step.kind === "response" ||
          step.kind === "thinking") && (
          <div className="ml-5 rounded-md border border-white/5 bg-white/2 px-3 py-2">
            <p className="text-[0.72rem] text-white/50 leading-relaxed">
              {step.content}
            </p>
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
        "flex flex-col gap-0 overflow-hidden rounded-xl border border-white/10 bg-white/2",
        className
      )}
    >
      {/* Visual link: coloured top bar connecting to source task */}
      <div className="flex items-center gap-2 border-white/8 border-b bg-white/1.5 px-3 py-2">
        {/* Pulse dot */}
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

        {/* Source task title (truncated) */}
        <span className="min-w-0 flex-1 truncate font-medium text-[0.7rem] text-white/70">
          {run.taskTitle}
        </span>

        {/* Model badge */}
        <span className="shrink-0 rounded-md border border-white/8 bg-white/5 px-1.5 py-0.5 font-mono text-[0.6rem] text-white/40">
          {run.model}
        </span>
      </div>

      {/* Steps list */}
      <div className="flex flex-col gap-3 px-3 py-3">
        {run.steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>

      {/* Footer: progress + elapsed */}
      <div className="flex items-center gap-3 border-white/5 border-t px-3 py-2">
        {/* Progress bar */}
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
