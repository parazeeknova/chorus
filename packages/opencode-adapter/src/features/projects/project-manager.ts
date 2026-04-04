import type { OpencodeClient, Project } from "@opencode-ai/sdk/v2";

export interface ProjectLookupInput {
  directory?: string;
  workspace?: string;
}

export interface RepoProject {
  directory: string;
  projectId?: string;
  projectName?: string;
  sandboxes: string[];
  worktree: string;
}

export interface RepoContext extends RepoProject {
  branch?: string;
}

export interface RepoWorktree {
  directory: string;
}

function normalizeProject(project: Project): RepoProject {
  return {
    directory: project.worktree,
    worktree: project.worktree,
    projectId: project.id,
    projectName: project.name,
    sandboxes: project.sandboxes,
  };
}

function normalizeWorktree(worktree: string): RepoWorktree {
  return {
    directory: worktree,
  };
}

function withLookup(input?: ProjectLookupInput) {
  return {
    directory: input?.directory,
    workspace: input?.workspace,
  };
}

export class ProjectManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async list(input?: ProjectLookupInput): Promise<RepoProject[]> {
    const result = await this.client.project.list(withLookup(input));
    return (result.data ?? []).map(normalizeProject);
  }

  async current(input?: ProjectLookupInput): Promise<RepoProject | null> {
    try {
      const result = await this.client.project.current(withLookup(input));
      return result.data ? normalizeProject(result.data) : null;
    } catch {
      return null;
    }
  }

  async listWorktrees(input?: ProjectLookupInput): Promise<RepoWorktree[]> {
    try {
      const result = await this.client.worktree.list(withLookup(input));
      return (result.data ?? []).map(normalizeWorktree);
    } catch {
      return [];
    }
  }

  async getPath(input?: ProjectLookupInput): Promise<{
    directory: string;
    worktree: string;
  } | null> {
    try {
      const result = await this.client.path.get(withLookup(input));
      if (!result.data) {
        return null;
      }

      return {
        directory: result.data.directory,
        worktree: result.data.worktree,
      };
    } catch {
      return null;
    }
  }

  async getBranch(input?: ProjectLookupInput): Promise<string | undefined> {
    try {
      const result = await this.client.vcs.get(withLookup(input));
      return result.data?.branch;
    } catch {
      return undefined;
    }
  }

  async inspect(input: ProjectLookupInput): Promise<RepoContext> {
    const [project, pathInfo, branch] = await Promise.all([
      this.current(input),
      this.getPath(input),
      this.getBranch(input),
    ]);

    const directory =
      pathInfo?.directory ?? input.directory ?? project?.directory ?? "";
    const worktree = pathInfo?.worktree ?? project?.worktree ?? directory;

    return {
      directory,
      worktree,
      projectId: project?.projectId,
      projectName: project?.projectName,
      sandboxes: project?.sandboxes ?? [],
      branch,
    };
  }
}
