import type { BoardSeed, ProjectListResponse } from "@chorus/contracts";
import { OpenCodeAdapter } from "@chorus/oc-adapter";
import type { FolderPicker } from "./folder-picker";

function toBoardSeed(
  repo: Awaited<ReturnType<ProjectService["inspectDirectory"]>>
) {
  return {
    title:
      repo.projectName ?? repo.directory.split("/").pop() ?? repo.directory,
    repo: {
      directory: repo.directory,
      worktree: repo.worktree,
      projectId: repo.projectId,
      projectName: repo.projectName,
      branch: repo.branch,
      sandboxes: repo.sandboxes,
    },
  } satisfies BoardSeed;
}

export class ProjectService {
  readonly #baseUrl: string;
  readonly #defaultDirectory: string;
  readonly #folderPicker: FolderPicker;

  constructor(
    baseUrl: string,
    defaultDirectory: string,
    folderPicker: FolderPicker
  ) {
    this.#baseUrl = baseUrl;
    this.#defaultDirectory = defaultDirectory;
    this.#folderPicker = folderPicker;
  }

  async listProjects(): Promise<ProjectListResponse> {
    const adapter = OpenCodeAdapter.from({
      baseUrl: this.#baseUrl,
      directory: this.#defaultDirectory,
    });

    const projects = await adapter.projects.list({
      directory: this.#defaultDirectory,
    });

    return {
      projects: projects.map((project) => ({
        directory: project.directory,
        worktree: project.worktree,
        projectId: project.projectId,
        projectName: project.projectName,
        sandboxes: project.sandboxes,
      })),
    };
  }

  inspectDirectory(directory: string) {
    const adapter = OpenCodeAdapter.from({
      baseUrl: this.#baseUrl,
      directory,
    });

    return adapter.projects.inspect({ directory });
  }

  async openFolder(): Promise<BoardSeed | null> {
    const directory = await this.#folderPicker.pickFolder();
    if (!directory) {
      return null;
    }

    const repo = await this.inspectDirectory(directory);
    return toBoardSeed(repo);
  }

  createBoardSeedFromProject(project: ProjectListResponse["projects"][number]) {
    return {
      title:
        project.projectName ??
        project.directory.split("/").pop() ??
        project.directory,
      repo: {
        ...project,
      },
    } satisfies BoardSeed;
  }
}
