import { describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import { createProjectRoutes } from "./projects";

function makeProjectService() {
  return {
    listProjects: mock(async () => ({
      projects: [
        {
          directory: "/tmp/repo",
          worktree: "/tmp/repo",
          projectId: "proj-1",
          projectName: "repo",
          sandboxes: [],
        },
      ],
    })),
    openFolder: mock(async () => ({
      title: "repo",
      repo: {
        directory: "/tmp/repo",
        worktree: "/tmp/repo",
        projectId: "proj-1",
        projectName: "repo",
        branch: "main",
        sandboxes: [],
      },
    })),
  };
}

describe("project routes", () => {
  test("lists known projects", async () => {
    const projectService = makeProjectService();
    const app = new Elysia().use(createProjectRoutes(projectService as never));

    const response = await app.handle(new Request("http://localhost/projects"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      projects: [
        {
          directory: "/tmp/repo",
          worktree: "/tmp/repo",
          projectId: "proj-1",
          projectName: "repo",
          sandboxes: [],
        },
      ],
    });
  });

  test("opens a folder and returns a board seed", async () => {
    const projectService = makeProjectService();
    const app = new Elysia().use(createProjectRoutes(projectService as never));

    const response = await app.handle(
      new Request("http://localhost/projects/open-folder", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      title: "repo",
      repo: {
        directory: "/tmp/repo",
        worktree: "/tmp/repo",
        projectId: "proj-1",
        projectName: "repo",
        branch: "main",
        sandboxes: [],
      },
    });
  });
});
