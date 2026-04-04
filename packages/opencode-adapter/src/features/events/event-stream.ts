import type { Event as OCEvent, OpencodeClient } from "@opencode-ai/sdk/v2";

export type { Event as AgentEvent, SessionStatus } from "@opencode-ai/sdk/v2";

export type EventCallback = (event: OCEvent) => void;

export interface EventStreamHandle {
  stop: () => void;
}

interface DirSubscription {
  abort: AbortController;
}

export class EventStream {
  readonly client: OpencodeClient;
  #running = false;
  readonly #dirSubscriptions = new Map<string, DirSubscription>();

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async subscribe(
    onEvent: EventCallback,
    options?: { directory?: string }
  ): Promise<EventStreamHandle> {
    this.#running = true;

    const key = options?.directory ?? "__default__";

    if (this.#dirSubscriptions.has(key)) {
      return {
        stop: () => {
          this.#dirSubscriptions.delete(key);
          if (this.#dirSubscriptions.size === 0) {
            this.#running = false;
          }
        },
      };
    }

    const abort = new AbortController();
    const sub: DirSubscription = { abort };
    this.#dirSubscriptions.set(key, sub);

    const events = await this.client.event.subscribe({
      directory: options?.directory,
    });

    this.#consume(
      events.stream as AsyncIterable<OCEvent>,
      onEvent,
      abort
    ).catch(() => {
      // handled internally
    });

    return {
      stop: () => {
        this.#dirSubscriptions.delete(key);
        abort.abort();
        if (this.#dirSubscriptions.size === 0) {
          this.#running = false;
        }
      },
    };
  }

  async #consume(
    stream: AsyncIterable<OCEvent>,
    onEvent: EventCallback,
    abort: AbortController
  ): Promise<void> {
    try {
      for await (const event of stream) {
        if (!this.#running || abort.signal.aborted) {
          break;
        }
        onEvent(event);
      }
    } catch (error) {
      if (this.#running && !abort.signal.aborted) {
        console.error("[oc-adapter] event stream error:", error);
      }
    }
  }

  stop() {
    this.#running = false;
    for (const sub of this.#dirSubscriptions.values()) {
      sub.abort.abort();
    }
    this.#dirSubscriptions.clear();
  }
}

export type NormalizedActivity =
  | "writing"
  | "thinking"
  | "waiting_for_approval"
  | "error"
  | "idle";

export interface FileDiffInfo {
  additions?: number;
  after?: string;
  before?: string;
  deletions?: number;
  filePath: string;
}

export interface NormalizedAgentEvent {
  activity?: NormalizedActivity;
  error?: string;
  fileDiff?: FileDiffInfo;
  permissionID?: string;
  sessionID?: string;
  text?: string;
  timestamp: number;
  toolName?: string;
  toolState?: string;
  type: string;
}

function safeNum(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function safeStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function extractFileDiffFromCompleted(
  toolName: string,
  metadata: Record<string, unknown>
): FileDiffInfo | undefined {
  if ((toolName === "edit" || toolName === "write") && metadata.filediff) {
    const fd = metadata.filediff as Record<string, unknown>;
    return {
      additions: safeNum(fd.additions),
      after: safeStr(fd.after),
      before: safeStr(fd.before),
      deletions: safeNum(fd.deletions),
      filePath: safeStr(fd.file) ?? "",
    };
  }
  if (toolName === "apply_patch" && Array.isArray(metadata.files)) {
    const files = metadata.files as Record<string, unknown>[];
    if (files.length === 0) {
      return undefined;
    }
    const f = files[0];
    return {
      additions: safeNum(f.additions),
      after: safeStr(f.after),
      before: safeStr(f.before),
      deletions: safeNum(f.deletions),
      filePath: safeStr(f.filePath) ?? "",
    };
  }
  return undefined;
}

function extractFileDiffFromRunning(
  toolName: string,
  input: Record<string, unknown>
): FileDiffInfo | undefined {
  if (
    (toolName === "edit" || toolName === "write") &&
    typeof input.filePath === "string"
  ) {
    const diff: FileDiffInfo = { filePath: input.filePath };
    if (
      toolName === "edit" &&
      typeof input.oldString === "string" &&
      typeof input.newString === "string"
    ) {
      diff.before = input.oldString;
      diff.after = input.newString;
    }
    return diff;
  }
  return undefined;
}

function extractFileDiff(
  toolName: string,
  state: {
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    status: string;
  }
): FileDiffInfo | undefined {
  if (state.status === "completed" && state.metadata) {
    return extractFileDiffFromCompleted(toolName, state.metadata);
  }
  if (state.status === "running" && state.input) {
    return extractFileDiffFromRunning(toolName, state.input);
  }
  return undefined;
}

function normalizeMessagePartUpdated(
  base: NormalizedAgentEvent,
  raw: Extract<OCEvent, { type: "message.part.updated" }>
): NormalizedAgentEvent {
  const part = raw.properties.part;
  if (part.type === "text") {
    return {
      ...base,
      sessionID: raw.properties.sessionID,
      activity: "writing",
      text: part.text,
    };
  }
  if (part.type === "tool") {
    const state = part.state;
    const fileDiff = extractFileDiff(part.tool, state);
    return {
      ...base,
      sessionID: raw.properties.sessionID,
      activity: state.status === "running" ? "thinking" : "writing",
      toolName: part.tool,
      toolState: state.status,
      fileDiff,
    };
  }
  if (part.type === "reasoning") {
    return {
      ...base,
      sessionID: raw.properties.sessionID,
      activity: "thinking",
      text: part.text,
    };
  }
  return { ...base, sessionID: raw.properties.sessionID };
}

function normalizeSessionStatus(
  base: NormalizedAgentEvent,
  raw: Extract<OCEvent, { type: "session.status" }>
): NormalizedAgentEvent {
  const status = raw.properties.status;
  let activity: NormalizedActivity = "idle";
  if (status.type === "busy") {
    activity = "thinking";
  }
  if (status.type === "retry") {
    activity = "thinking";
  }
  return {
    ...base,
    sessionID: raw.properties.sessionID,
    activity,
  };
}

function normalizeMessageUpdated(
  base: NormalizedAgentEvent,
  raw: Extract<OCEvent, { type: "message.updated" }>
): NormalizedAgentEvent {
  const info = raw.properties.info;
  if (info.role === "assistant" && "error" in info && info.error) {
    return {
      ...base,
      sessionID: raw.properties.sessionID,
      activity: "error",
      error: String(info.error.data?.message ?? ""),
    };
  }
  return { ...base, sessionID: raw.properties.sessionID };
}

export function normalizeEvent(raw: OCEvent): NormalizedAgentEvent {
  const base: NormalizedAgentEvent = {
    type: raw.type,
    timestamp: Date.now(),
  };

  switch (raw.type) {
    case "message.part.updated":
      return normalizeMessagePartUpdated(base, raw);
    case "session.status":
      return normalizeSessionStatus(base, raw);
    case "session.idle":
      return { ...base, sessionID: raw.properties.sessionID, activity: "idle" };
    case "permission.asked":
      return {
        ...base,
        sessionID: raw.properties.sessionID,
        activity: "waiting_for_approval",
        permissionID: raw.properties.id,
      };
    case "session.error":
      return {
        ...base,
        sessionID: raw.properties.sessionID,
        activity: "error",
        error: String(raw.properties.error?.data?.message ?? ""),
      };
    case "message.updated":
      return normalizeMessageUpdated(base, raw);
    default:
      return base;
  }
}
