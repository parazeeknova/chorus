import type {
  EventStreamHandle,
  NormalizedAgentEvent,
  PermissionHandlerInput,
  SessionCreateInput,
  SessionPromptInput,
} from "@chorus/oc-adapter";
import { OpenCodeAdapter } from "@chorus/oc-adapter";

export type EventSubscriber = (event: NormalizedAgentEvent) => void;

export interface BridgeStatus {
  activeSessions: number;
  connected: boolean;
  opencodeUrl: string;
  uptime: number;
}

export class OpenCodeBridge {
  readonly adapter: OpenCodeAdapter;
  readonly #baseUrl: string;
  #eventHandle: EventStreamHandle | null = null;
  readonly #subscribers = new Set<EventSubscriber>();
  readonly #activeSessions = new Map<string, string>();
  readonly #startTime = Date.now();

  constructor(baseUrl: string, directory: string) {
    this.#baseUrl = baseUrl;
    this.adapter = OpenCodeAdapter.from({
      baseUrl,
      directory,
    });
    this.#startTime = Date.now();
  }

  subscribe(subscriber: EventSubscriber): () => void {
    this.#subscribers.add(subscriber);
    return () => {
      this.#subscribers.delete(subscriber);
    };
  }

  async start(): Promise<void> {
    const handle = await this.adapter.events.subscribe((event) => {
      const normalized = this.adapter.normalize(event);
      this.#trackSession(normalized);
      this.#broadcast(normalized);
    });

    this.#eventHandle = handle;
  }

  #trackSession(event: NormalizedAgentEvent): void {
    if (event.sessionID) {
      this.#activeSessions.set(event.sessionID, event.type);
    }
  }

  #broadcast(event: NormalizedAgentEvent): void {
    for (const subscriber of this.#subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error("[bridge] subscriber error:", error);
      }
    }
  }

  createSession(input: SessionCreateInput) {
    return this.adapter.sessions.create(input);
  }

  promptSession(input: SessionPromptInput) {
    return this.adapter.sessions.prompt(input);
  }

  promptSessionAsync(input: SessionPromptInput) {
    return this.adapter.sessions.promptAsync(input);
  }

  abortSession(sessionID: string) {
    return this.adapter.sessions.abort(sessionID);
  }

  replyPermission(input: PermissionHandlerInput) {
    return this.adapter.permissions.reply(input);
  }

  get races() {
    return this.adapter.races;
  }

  getStatus(): BridgeStatus {
    return {
      connected: this.#eventHandle !== null,
      opencodeUrl: this.#baseUrl,
      activeSessions: this.#activeSessions.size,
      uptime: Date.now() - this.#startTime,
    };
  }

  stop(): void {
    this.#eventHandle?.stop();
    this.#eventHandle = null;
    this.#subscribers.clear();
    this.#activeSessions.clear();
  }
}
