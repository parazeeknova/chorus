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

export interface NormalizedAgentEvent {
  activity?: NormalizedActivity;
  error?: string;
  permissionID?: string;
  sessionID?: string;
  text?: string;
  timestamp: number;
  toolName?: string;
  toolState?: string;
  type: string;
}

export function normalizeEvent(raw: OCEvent): NormalizedAgentEvent {
  const base: NormalizedAgentEvent = {
    type: raw.type,
    timestamp: Date.now(),
  };

  switch (raw.type) {
    case "message.part.updated": {
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
        return {
          ...base,
          sessionID: raw.properties.sessionID,
          activity: part.state.status === "running" ? "thinking" : "writing",
          toolName: part.tool,
          toolState: part.state.status,
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

    case "session.status": {
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

    case "session.idle": {
      return {
        ...base,
        sessionID: raw.properties.sessionID,
        activity: "idle",
      };
    }

    case "permission.asked": {
      return {
        ...base,
        sessionID: raw.properties.sessionID,
        activity: "waiting_for_approval",
        permissionID: raw.properties.id,
      };
    }

    case "session.error": {
      return {
        ...base,
        sessionID: raw.properties.sessionID,
        activity: "error",
        error: String(raw.properties.error?.data?.message ?? ""),
      };
    }

    case "message.updated": {
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

    default: {
      return base;
    }
  }
}
