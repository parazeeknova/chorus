import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { NormalizedAgentEvent } from "@chorus/oc-adapter";
import { WorkspaceStore } from "./store";

function createTempPath(name: string) {
  return join("/tmp", `chorus-workspace-${name}-${Date.now()}.json`);
}

describe("WorkspaceStore", () => {
  const paths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      paths.map(async (path) => {
        await rm(path, { force: true }).catch(() => undefined);
      })
    );
    paths.length = 0;
  });

  test("persists and reloads a workspace snapshot", async () => {
    const path = createTempPath("persist");
    paths.push(path);

    const store = new WorkspaceStore(path);
    await store.load();

    await store.replaceSnapshot({
      boards: [
        {
          boardId: "board-1",
          columns: {
            queue: [],
            in_progress: [],
            approve: [],
            done: [],
          },
          position: { x: 10, y: 20 },
          repo: {
            directory: "/tmp/repo",
            worktree: "/tmp/repo",
            sandboxes: [],
          },
          session: {
            state: "uninitialized",
          },
          title: "Repo Board",
        },
      ],
      preferences: {
        composerHintDismissed: false,
      },
      selectedBoardId: "board-1",
    });

    const reloaded = new WorkspaceStore(path);
    await reloaded.load();

    expect(reloaded.getSnapshot()).toEqual({
      boards: [
        {
          boardId: "board-1",
          columns: {
            queue: [],
            in_progress: [],
            approve: [],
            done: [],
          },
          position: { x: 10, y: 20 },
          repo: {
            directory: "/tmp/repo",
            worktree: "/tmp/repo",
            sandboxes: [],
          },
          session: {
            state: "uninitialized",
          },
          title: "Repo Board",
        },
      ],
      preferences: {
        composerHintDismissed: false,
      },
      previousWorkspaces: [
        {
          id: "/tmp/repo",
          lastOpenedAt: expect.any(Number),
          repo: {
            directory: "/tmp/repo",
            worktree: "/tmp/repo",
            sandboxes: [],
          },
          title: "Repo Board",
        },
      ],
      revision: 1,
      selectedBoardId: "board-1",
    });
  });

  test("updates persisted board session state", async () => {
    const path = createTempPath("session");
    paths.push(path);

    const store = new WorkspaceStore(path);
    await store.load();

    await store.replaceSnapshot({
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
            state: "uninitialized",
          },
          title: "Repo Board",
        },
      ],
      preferences: {
        composerHintDismissed: false,
      },
      selectedBoardId: "board-1",
    });

    await store.updateBoardSession("board-1", {
      sessionId: "sess-123",
      state: "active",
    });

    expect(store.getBoard("board-1")?.session).toEqual({
      sessionId: "sess-123",
      state: "active",
    });
  });

  test("projects agent events into the persisted workspace", async () => {
    const path = createTempPath("event");
    paths.push(path);

    const store = new WorkspaceStore(path);
    await store.load();

    await store.replaceSnapshot({
      boards: [
        {
          boardId: "board-1",
          columns: {
            queue: [],
            in_progress: [
              {
                id: "task-1",
                label: "Repo",
                labelVariant: "primary-light",
                run: {
                  elapsed: "0m 00s",
                  model: "OpenCode",
                  sessionId: "sess-123",
                  startedAt: Date.now(),
                  steps: [],
                  taskTitle: "Implement feature",
                },
                runId: "sess-123",
                title: "Implement feature",
              },
            ],
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
            currentTaskId: "task-1",
            sessionId: "sess-123",
            state: "active",
          },
          title: "Repo Board",
        },
      ],
      preferences: {
        composerHintDismissed: false,
      },
      selectedBoardId: "board-1",
    });

    const snapshot = await store.applyAgentEvent({
      activity: "writing",
      sessionID: "sess-123",
      text: "streamed update",
      timestamp: Date.now(),
      type: "message.part.updated",
    } satisfies NormalizedAgentEvent);

    expect(snapshot?.boards[0]?.columns.in_progress[0]?.run?.steps).toEqual([
      {
        id: expect.any(String),
        kind: "response",
        status: "running",
        summary: "streamed update",
        content: "streamed update",
      },
    ]);
  });
});
