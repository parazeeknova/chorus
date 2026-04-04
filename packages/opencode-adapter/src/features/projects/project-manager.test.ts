import { describe, expect, mock, test } from "bun:test";
import { ProjectManager } from "./project-manager";

describe("ProjectManager", () => {
  test("normalizes listed projects", async () => {
    const manager = new ProjectManager({
      project: {
        list: mock(async () => ({
          data: [
            {
              id: "proj-1",
              worktree: "/tmp/repo",
              name: "repo",
              sandboxes: ["sandbox-a"],
              time: { created: 1, updated: 2 },
            },
          ],
        })),
      },
    } as never);

    await expect(manager.list()).resolves.toEqual([
      {
        directory: "/tmp/repo",
        worktree: "/tmp/repo",
        projectId: "proj-1",
        projectName: "repo",
        sandboxes: ["sandbox-a"],
      },
    ]);
  });

  test("inspects directory with project, path, and branch data", async () => {
    const manager = new ProjectManager({
      path: {
        get: mock(async () => ({
          data: {
            home: "/home/paper",
            state: "/tmp/state",
            config: "/tmp/config",
            worktree: "/tmp/repo",
            directory: "/tmp/repo",
          },
        })),
      },
      project: {
        current: mock(async () => ({
          data: {
            id: "proj-1",
            worktree: "/tmp/repo",
            name: "repo",
            sandboxes: ["sandbox-a"],
            time: { created: 1, updated: 2 },
          },
        })),
      },
      vcs: {
        get: mock(async () => ({
          data: {
            branch: "main",
          },
        })),
      },
    } as never);

    await expect(
      manager.inspect({
        directory: "/tmp/repo",
      })
    ).resolves.toEqual({
      directory: "/tmp/repo",
      worktree: "/tmp/repo",
      projectId: "proj-1",
      projectName: "repo",
      sandboxes: ["sandbox-a"],
      branch: "main",
    });
  });

  test("falls back to directory data when project lookup fails", async () => {
    const manager = new ProjectManager({
      path: {
        get: mock(async () => ({
          data: {
            home: "/home/paper",
            state: "/tmp/state",
            config: "/tmp/config",
            worktree: "/tmp/repo",
            directory: "/tmp/repo",
          },
        })),
      },
      project: {
        current: mock(() => {
          throw new Error("not found");
        }),
      },
      vcs: {
        get: mock(async () => ({
          data: {},
        })),
      },
    } as never);

    await expect(
      manager.inspect({
        directory: "/tmp/repo",
      })
    ).resolves.toEqual({
      directory: "/tmp/repo",
      worktree: "/tmp/repo",
      projectId: undefined,
      projectName: undefined,
      sandboxes: [],
      branch: undefined,
    });
  });
});
