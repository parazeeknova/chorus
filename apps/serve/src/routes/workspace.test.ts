import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { Elysia } from "elysia";
import { createWsClientManager } from "../events/broadcaster";
import { WorkspaceStore } from "../workspace/store";
import { createWorkspaceRoutes } from "./workspace";

function createTempPath(name: string) {
  return join("/tmp", `chorus-workspace-route-${name}-${Date.now()}.json`);
}

describe("workspace routes", () => {
  test("returns the persisted workspace snapshot", async () => {
    const path = createTempPath("get");
    const store = new WorkspaceStore(path);
    await store.load();
    await store.replaceSnapshot({
      boards: [],
      preferences: {
        boardViewMode: "relaxed",
        composerHintDismissed: false,
        speechVoiceId: null,
      },
      selectedBoardId: null,
    });

    const app = new Elysia().use(
      createWorkspaceRoutes(store, createWsClientManager())
    );

    const response = await app.handle(
      new Request("http://localhost/workspace")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      boards: [],
      preferences: {
        boardViewMode: "relaxed",
        composerHintDismissed: false,
        speechVoiceId: null,
      },
      previousWorkspaces: [],
      revision: 1,
      selectedBoardId: null,
    });

    await rm(path, { force: true });
  });

  test("persists workspace updates", async () => {
    const path = createTempPath("put");
    const store = new WorkspaceStore(path);
    await store.load();
    const app = new Elysia().use(
      createWorkspaceRoutes(store, createWsClientManager())
    );

    const response = await app.handle(
      new Request("http://localhost/workspace/mutations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          baseRevision: 0,
          clientId: "client-1",
          mutationId: "mutation-1",
          type: "board.create",
          payload: {
            seed: {
              title: "Repo Board",
              repo: {
                directory: "/tmp/repo",
                worktree: "/tmp/repo",
                sandboxes: [],
              },
            },
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(store.getSnapshot().boards[0]?.title).toBe("Repo Board");

    await rm(path, { force: true });
  });
});
