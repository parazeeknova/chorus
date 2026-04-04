import { Elysia } from "elysia";
import { FolderPickerUnavailableError } from "../projects/folder-picker";
import type { ProjectService } from "../projects/service";

export function createProjectRoutes(projectService: ProjectService) {
  return new Elysia()
    .get("/projects", async () => projectService.listProjects())
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
