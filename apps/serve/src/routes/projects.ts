import { Elysia, t } from "elysia";
import { FolderPickerUnavailableError } from "../projects/folder-picker";
import type { ProjectService } from "../projects/service";

export function createProjectRoutes(projectService: ProjectService) {
  return new Elysia()
    .get("/projects", async () => projectService.listProjects())
    .get(
      "/models",
      ({ query }) => {
        return query.directory
          ? projectService.listModelsForDirectory(query.directory)
          : projectService.listModels();
      },
      {
        query: t.Object({
          directory: t.Optional(t.String()),
        }),
      }
    )
    .post(
      "/opencode/models",
      async ({ body }) => {
        return {
          opened: await projectService.openModels(body.directory),
        };
      },
      {
        body: t.Object({
          directory: t.String(),
        }),
      }
    )
    .post(
      "/opencode/connect",
      async ({ body }) => {
        return {
          opened: await projectService.runConnect(body.directory),
        };
      },
      {
        body: t.Object({
          directory: t.String(),
        }),
      }
    )
    .post("/projects/open-folder", async ({ set }) => {
      try {
        return await projectService.openFolder();
      } catch (error) {
        if (error instanceof FolderPickerUnavailableError) {
          set.status = 503;
          return {
            code: "folder_picker_unavailable",
            message: error.message,
          };
        }

        throw error;
      }
    });
}
