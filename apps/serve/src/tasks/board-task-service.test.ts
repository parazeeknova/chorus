import { describe, expect, mock, test } from "bun:test";
import { BoardTaskService } from "./board-task-service";

function makeMockBridge() {
  return {
    createSession: mock(async () => ({ id: "sess-123" })),
    promptSession: mock(async () => undefined),
  };
}

describe("BoardTaskService", () => {
  test("creates a session for the first prompt", async () => {
    const bridge = makeMockBridge();
    const service = new BoardTaskService(bridge as never);

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
    expect(bridge.promptSession).toHaveBeenCalledWith({
      sessionID: "sess-123",
      directory: "/tmp/repo",
      text: "build feature",
      model: undefined,
      agent: undefined,
    });
  });

  test("reuses the stored session for later prompts", async () => {
    const bridge = makeMockBridge();
    const service = new BoardTaskService(bridge as never);

    await service.queuePrompt({
      boardId: "board-1",
      directory: "/tmp/repo",
      text: "first prompt",
    });

    const result = await service.queuePrompt({
      boardId: "board-1",
      directory: "/tmp/repo",
      text: "follow up",
    });

    expect(result.createdSession).toBe(false);
    expect(bridge.createSession).toHaveBeenCalledTimes(1);
    expect(bridge.promptSession).toHaveBeenLastCalledWith({
      sessionID: "sess-123",
      directory: "/tmp/repo",
      text: "follow up",
      model: undefined,
      agent: undefined,
    });
  });
});
