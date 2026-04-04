import { createLogger } from "@chorus/logger";
import type {
  EventStreamHandle,
  NormalizedAgentEvent,
  PermissionHandlerInput,
  SessionCreateInput,
  SessionForkInput,
  SessionPromptInput,
} from "@chorus/oc-adapter";
import { OpenCodeAdapter } from "@chorus/oc-adapter";

export type EventSubscriber = (event: NormalizedAgentEvent) => void;

export interface BridgeStatus {
  activeSessions: number;
  connected: boolean;
  opencodeUrl: string;
  subscribedDirectories: string[];
  uptime: number;
}

export class OpenCodeBridge {
  readonly adapter: OpenCodeAdapter;
  readonly #baseUrl: string;
  readonly #defaultDirectory: string;
  #eventHandle: EventStreamHandle | null = null;
  readonly #directoryHandles = new Map<string, EventStreamHandle>();
  readonly #subscribers = new Set<EventSubscriber>();
  readonly #activeSessions = new Map<string, string>();
  readonly #startTime = Date.now();
  readonly #logger = createLogger(
    {
      env: process.env.NODE_ENV === "production" ? "production" : "development",
    },
    "BRIDGE"
  );

  constructor(baseUrl: string, directory: string) {
    this.#baseUrl = baseUrl;
    this.#defaultDirectory = directory;
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
    if (this.#eventHandle !== null) {
      return;
    }

    const handle = await this.adapter.events.subscribe((event) => {
      const normalized = this.adapter.normalize(event);
      this.#trackSession(normalized);
      this.#broadcast(normalized);
    });

    this.#eventHandle = handle;
    this.#logger.info("event-subscription-started", {
      directory: this.#defaultDirectory,
    });
  }

  async subscribeDirectory(directory: string): Promise<void> {
    if (this.#directoryHandles.has(directory)) {
      return;
    }

    this.#logger.info("subscribing-to-directory", { directory });

    const handle = await this.adapter.events.subscribe(
      (event) => {
        const normalized = this.adapter.normalize(event);
        this.#trackSession(normalized);
        this.#broadcast(normalized);
      },
      { directory }
    );

    this.#directoryHandles.set(directory, handle);
    this.#logger.info("directory-subscribed", { directory });
  }

  #trackSession(event: NormalizedAgentEvent): void {
    if (!event.sessionID) {
      return;
    }

    const activity = event.activity ?? event.type;

    if (activity === "idle") {
      this.#activeSessions.delete(event.sessionID);
    } else {
      this.#activeSessions.set(event.sessionID, activity);
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

  forkSession(input: SessionForkInput) {
    return this.adapter.sessions.fork(input);
  }

  revertSession(sessionID: string) {
    this.#logger.debug("Reverting session", { sessionID });
    return this.adapter.sessions
      .revert({ sessionID })
      .catch((error: unknown) => {
        this.#logger.error(
          "Failed to revert session",
          error instanceof Error ? error : undefined,
          { sessionID }
        );
        throw error;
      });
  }

  unrevertSession(sessionID: string) {
    this.#logger.debug("Unreverting session", { sessionID });
    return this.adapter.sessions
      .unrevert({ sessionID })
      .catch((error: unknown) => {
        this.#logger.error(
          "Failed to unrevert session",
          error instanceof Error ? error : undefined,
          { sessionID }
        );
        throw error;
      });
  }

  startRace(
    parentSessionID: string,
    models: Array<{ providerID: string; modelID: string }>,
    baseTitle?: string
  ) {
    return this.adapter.races.createRaceSessions(
      parentSessionID,
      models,
      baseTitle
    );
  }

  promptRace(
    sessions: Array<{
      sessionID: string;
      model: { providerID: string; modelID: string };
    }>,
    text: string
  ) {
    return this.adapter.races.promptAll(sessions, text);
  }

  get races() {
    return this.adapter.races;
  }

  getStatus(): BridgeStatus {
    return {
      connected: this.#eventHandle !== null,
      opencodeUrl: this.#baseUrl,
      activeSessions: this.#activeSessions.size,
      subscribedDirectories: [
        this.#defaultDirectory,
        ...this.#directoryHandles.keys(),
      ],
      uptime: Date.now() - this.#startTime,
    };
  }

  stop(): void {
    this.#eventHandle?.stop();
    this.#eventHandle = null;
    for (const handle of this.#directoryHandles.values()) {
      handle.stop();
    }
    this.#directoryHandles.clear();
    this.#subscribers.clear();
    this.#activeSessions.clear();
  }
}
