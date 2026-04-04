import type {
  QueueBoardPromptInput,
  QueueBoardPromptResponse,
} from "@chorus/contracts";
import { queueBoardPromptInputSchema } from "@chorus/contracts";
import type { OpenCodeBridge } from "../bridge/opencode/bridge";
import type { WorkspaceStore } from "../workspace/store";
import { BoardSessionRegistry } from "./board-session-registry";

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

    let sessionId =
      input.sessionId ??
      existing?.sessionId ??
      persistedBoard?.session.sessionId;
    let createdSession = false;

    if (!sessionId) {
      const session = await this.#bridge.createSession({
        title: input.text.slice(0, 80),
        directory: input.directory,
      });

      sessionId = session.id;
      createdSession = true;
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

    await this.#bridge.promptSession({
      sessionID: sessionId,
      directory: input.directory,
      text: input.text,
      model: input.model,
      agent: input.agent,
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
