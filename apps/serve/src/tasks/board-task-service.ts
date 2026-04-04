import type {
  QueueBoardPromptInput,
  QueueBoardPromptResponse,
} from "@chorus/contracts";
import { queueBoardPromptInputSchema } from "@chorus/contracts";
import { createLogger } from "@chorus/logger";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";
import type { WorkspaceStore } from "../workspace/store";
import { BoardSessionRegistry } from "./board-session-registry";

const logger = createLogger(
  { env: process.env.NODE_ENV === "production" ? "production" : "development" },
  "SERVE:TASKS"
);

export class BoardTaskService {
  readonly #bridge: OpenCodeBridge;
  readonly #registry: BoardSessionRegistry;
  readonly #workspaceStore: WorkspaceStore;

  constructor(
    bridge: OpenCodeBridge,
    workspaceStore: WorkspaceStore,
    registry = new BoardSessionRegistry()
  ) {
    this.#bridge = bridge;
    this.#workspaceStore = workspaceStore;
    this.#registry = registry;
  }

  get registry() {
    return this.#registry;
  }

  getWorkspaceSnapshot() {
    return this.#workspaceStore.getSnapshot();
  }

  async queuePrompt(
    rawInput: QueueBoardPromptInput
  ): Promise<QueueBoardPromptResponse> {
    const input = queueBoardPromptInputSchema.parse(rawInput);
    const existing = this.#registry.get(input.boardId);
    const persistedBoard = this.#workspaceStore.getBoard(input.boardId);

    logger.info("queue-prompt:start", {
      boardId: input.boardId,
      directory: input.directory,
      model: input.model
        ? `${input.model.providerID}/${input.model.modelID}`
        : undefined,
      textPreview: input.text.slice(0, 100),
    });

    await this.#bridge.subscribeDirectory(input.directory);

    let sessionId =
      input.sessionId ??
      existing?.sessionId ??
      persistedBoard?.session.sessionId;
    let createdSession = false;

    if (sessionId) {
      let source = "persisted";
      if (input.sessionId) {
        source = "input";
      } else if (existing) {
        source = "registry";
      }

      logger.info("queue-prompt:reusing-session", {
        sessionId,
        boardId: input.boardId,
        source,
      });
    } else {
      logger.info("queue-prompt:creating-session", {
        boardId: input.boardId,
        directory: input.directory,
      });

      const session = await this.#bridge.createSession({
        title: input.text.slice(0, 80),
        directory: input.directory,
      });

      sessionId = session.id;
      createdSession = true;

      logger.info("queue-prompt:session-created", {
        sessionId,
        boardId: input.boardId,
      });
    }

    this.#registry.set({
      boardId: input.boardId,
      sessionId,
      directory: input.directory,
      projectId: input.projectId,
    });

    await this.#workspaceStore.updateBoardSession(input.boardId, {
      errorMessage: undefined,
      sessionId,
      state: "active",
    });

    logger.info("queue-prompt:sending-async", {
      sessionId,
      boardId: input.boardId,
      directory: input.directory,
      model: input.model
        ? `${input.model.providerID}/${input.model.modelID}`
        : undefined,
    });

    await this.#bridge.promptSessionAsync({
      sessionID: sessionId,
      directory: input.directory,
      text: input.text,
      model: input.model,
      agent: input.agent,
    });

    logger.info("queue-prompt:prompt-queued", {
      sessionId,
      boardId: input.boardId,
    });

    return {
      boardId: input.boardId,
      sessionId,
      createdSession,
      accepted: true,
      timestamp: Date.now(),
    };
  }
}
