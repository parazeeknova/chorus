import { describe, expect, mock, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { WorkspaceStore } from "../workspace/store";
import { BoardTaskService } from "./board-task-service";

function makeMockBridge() {
  return {
    createSession: mock(async () => ({ id: "sess-123" })),
    promptSession: mock(async () => undefined),
    promptSessionAsync: mock(async () => undefined),
  };
}

describe("BoardTaskService", () => {
  test("creates a session for the first prompt", async () => {
    const bridge = makeMockBridge();
    const path = join("/tmp", `chorus-board-task-${Date.now()}-create.json`);
    const workspaceStore = new WorkspaceStore(path);
    await workspaceStore.load();
    await workspaceStore.replaceSnapshot({
      boards: [
        {
          boardId: "board-1",
          columns: {
            queue: [],
            in_progress: [],
            approve: [],
            done: [],
          },
          position: { x: 0, y: 0 },
          repo: {
            directory: "/tmp/repo",
            worktree: "/tmp/repo",
            sandboxes: [],
          },
          session: { state: "uninitialized" },
          title: "Repo Board",
        },
      ],
      preferences: {
        composerHintDismissed: false,
        speechVoiceId: null,
      },
      selectedBoardId: "board-1",
    });
    const service = new BoardTaskService(bridge as never, workspaceStore);

    const result = await service.queuePrompt({
      boardId: "board-1",
      directory: "/tmp/repo",
      text: "build feature",
    });

    expect(result.boardId).toBe("board-1");
    expect(result.sessionId).toBe("sess-123");
    expect(result.createdSession).toBe(true);
    expect(bridge.createSession).toHaveBeenCalledWith({
      title: "build feature",
      directory: "/tmp/repo",
    });
    expect(bridge.promptSessionAsync).toHaveBeenCalledWith({
      sessionID: "sess-123",
      directory: "/tmp/repo",
      text: "build feature",
      model: undefined,
      agent: undefined,
    });

    await rm(path, { force: true });
  });

  test("reuses the persisted session for later prompts", async () => {
    const bridge = makeMockBridge();
    const path = join("/tmp", `chorus-board-task-${Date.now()}-reuse.json`);
    const workspaceStore = new WorkspaceStore(path);
    await workspaceStore.load();
    await workspaceStore.replaceSnapshot({
      boards: [
        {
          boardId: "board-1",
          columns: {
            queue: [],
            in_progress: [],
            approve: [],
            done: [],
          },
          position: { x: 0, y: 0 },
          repo: {
            directory: "/tmp/repo",
            worktree: "/tmp/repo",
            sandboxes: [],
          },
          session: {
            sessionId: "sess-123",
            state: "active",
          },
          title: "Repo Board",
        },
      ],
      preferences: {
        composerHintDismissed: false,
        speechVoiceId: null,
      },
      selectedBoardId: "board-1",
    });
    const service = new BoardTaskService(bridge as never, workspaceStore);

    const result = await service.queuePrompt({
      boardId: "board-1",
      directory: "/tmp/repo",
      text: "follow up",
    });

    expect(result.createdSession).toBe(false);
    expect(bridge.createSession).toHaveBeenCalledTimes(0);
    expect(bridge.promptSessionAsync).toHaveBeenLastCalledWith({
      sessionID: "sess-123",
      directory: "/tmp/repo",
      text: "follow up",
      model: undefined,
      agent: undefined,
    });

    await rm(path, { force: true });
  });
});
