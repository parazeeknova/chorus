import type { Event as OCEvent, OpencodeClient } from "@opencode-ai/sdk/v2";

export type { Event as AgentEvent, SessionStatus } from "@opencode-ai/sdk/v2";

export type EventCallback = (event: OCEvent) => void;

export interface EventStreamHandle {
  stop: () => void;
}

export class EventStream {
  readonly client: OpencodeClient;
  #running = false;
  #abortController: AbortController | null = null;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async subscribe(onEvent: EventCallback): Promise<EventStreamHandle> {
    this.#running = true;
    this.#abortController = new AbortController();

    const events = await this.client.event.subscribe();

    this.#consume(events.stream as AsyncIterable<OCEvent>, onEvent);

    return {
      stop: () => {
        this.#running = false;
        this.#abortController?.abort();
        this.#abortController = null;
      },
    };
  }

  async #consume(
    stream: AsyncIterable<OCEvent>,
    onEvent: EventCallback
  ): Promise<void> {
    try {
      for await (const event of stream) {
        if (!this.#running) {
          break;
        }
        onEvent(event);
      }
    } catch (error) {
      if (this.#running && !this.#abortController?.signal.aborted) {
        console.error("[oc-adapter] event stream error:", error);
      }
    }
  }

  stop() {
    this.#running = false;
    this.#abortController?.abort();
    this.#abortController = null;
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
