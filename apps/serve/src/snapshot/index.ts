import { exec } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createLogger } from "@chorus/logger";

const execAsync = promisify(exec);

const logger = createLogger(
  { env: process.env.NODE_ENV === "production" ? "production" : "development" },
  "SNAPSHOT"
);

export interface SnapshotPatch {
  files: string[];
  hash: string;
}

export interface FileDiff {
  additions: number;
  after: string | null;
  before: string | null;
  deletions: number;
  file: string;
  status: "added" | "deleted" | "modified";
}

export interface SnapshotResult {
  diff?: string;
  hash: string;
  patches?: SnapshotPatch[];
}

function getSnapshotDir(projectPath: string): string {
  const sanitizedName = projectPath.replace(/[^a-zA-Z0-9]/g, "_");
  return join(homedir(), ".chorus", "snapshots", sanitizedName);
}

function getGitDir(projectPath: string): string {
  return join(getSnapshotDir(projectPath), ".git");
}

async function ensureSnapshotRepo(projectPath: string): Promise<void> {
  const snapshotDir = getSnapshotDir(projectPath);
  const gitDir = getGitDir(projectPath);

  if (!existsSync(gitDir)) {
    mkdirSync(snapshotDir, { recursive: true });
    await execAsync(`git init --bare "${gitDir}"`, { cwd: snapshotDir });

    await execAsync(
      "git config core.autocrlf false && git config core.longpaths true",
      { cwd: projectPath, env: { ...process.env, GIT_DIR: gitDir } }
    );

    const excludePath = join(gitDir, "info", "exclude");
    mkdirSync(join(gitDir, "info"), { recursive: true });
    writeFileSync(
      excludePath,
      "*.log\nnode_modules/\ndist/\n.turbo/\n.git/\n.chorus/\n"
    );
  }
}

function runGit(
  projectPath: string,
  args: string
): Promise<{ stderr: string; stdout: string }> {
  const gitDir = getGitDir(projectPath);
  const env = { ...process.env, GIT_DIR: gitDir, GIT_WORK_TREE: projectPath };
  return execAsync(`git ${args}`, {
    cwd: projectPath,
    env,
    maxBuffer: 50 * 1024 * 1024,
  });
}

export async function track(projectPath: string): Promise<string> {
  await ensureSnapshotRepo(projectPath);

  await runGit(projectPath, "add -A");

  const { stdout } = await runGit(projectPath, "write-tree");
  return stdout.trim();
}

export async function restore(
  projectPath: string,
  hash: string
): Promise<void> {
  await ensureSnapshotRepo(projectPath);

  await runGit(projectPath, `read-tree ${hash}`);
  await runGit(projectPath, "checkout-index -a -f");
}

export async function revert(
  projectPath: string,
  patches: SnapshotPatch[]
): Promise<void> {
  await ensureSnapshotRepo(projectPath);

  for (const patch of patches) {
    const filesToCheckout = patch.files.filter((f) => {
      const fullPath = join(projectPath, f);
      return existsSync(fullPath);
    });

    if (filesToCheckout.length > 0) {
      const fileArgs = filesToCheckout.map((f) => `"${f}"`).join(" ");
      await runGit(projectPath, `checkout ${patch.hash} -- ${fileArgs}`);
    }

    const filesToDelete = patch.files.filter((f) => {
      const fullPath = join(projectPath, f);
      return !existsSync(fullPath);
    });

    for (const file of filesToDelete) {
      const fullPath = join(projectPath, file);
      if (existsSync(fullPath)) {
        await execAsync(`rm -f "${fullPath}"`);
      }
    }
  }
}

export async function getPatch(
  projectPath: string,
  fromHash: string
): Promise<SnapshotPatch> {
  await ensureSnapshotRepo(projectPath);

  const { stdout } = await runGit(
    projectPath,
    `diff --cached --name-only ${fromHash}`
  );

  const files = stdout.split("\n").filter((f) => f.trim().length > 0);

  return { hash: fromHash, files };
}

export async function getDiff(
  projectPath: string,
  fromHash: string
): Promise<string> {
  await ensureSnapshotRepo(projectPath);

  const { stdout } = await runGit(
    projectPath,
    `diff --cached ${fromHash} --stat`
  );

  return stdout;
}

export async function getFullDiff(
  projectPath: string,
  fromHash: string,
  toHash?: string
): Promise<FileDiff[]> {
  await ensureSnapshotRepo(projectPath);

  const targetHash = toHash ?? "HEAD";
  const { stdout } = await runGit(
    projectPath,
    `diff --name-status ${fromHash} ${targetHash}`
  );

  const lines = stdout.split("\n").filter((l) => l.trim().length > 0);

  const diffs: FileDiff[] = [];

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 2) {
      continue;
    }

    const statusCode = parts[0];
    const file = parts[1];

    let status: "added" | "deleted" | "modified";
    if (statusCode.startsWith("A")) {
      status = "added";
    } else if (statusCode.startsWith("D")) {
      status = "deleted";
    } else {
      status = "modified";
    }

    diffs.push({
      file,
      status,
      additions: 0,
      deletions: 0,
      before: null,
      after: null,
    });
  }

  return diffs;
}

export async function cleanup(projectPath: string): Promise<void> {
  try {
    await runGit(projectPath, "gc --prune=7.days");
  } catch (error) {
    logger.warn("snapshot-cleanup-failed", { error, projectPath });
  }
}
