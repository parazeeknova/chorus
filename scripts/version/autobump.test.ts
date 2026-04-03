import { describe, expect, test } from "bun:test";

import {
  createTemporaryChangeset,
  getChangedWorkspaces,
  getWorkspaceDirectory,
  getWorkspacesNeedingBump,
  nextVersion,
  parseVersion,
  shouldBumpRootVersion,
  type WorkspacePackage,
} from "./autobump";

describe("parseVersion", () => {
  test("parses a valid semantic version", () => {
    expect(parseVersion("2.14.99")).toEqual({
      major: 2,
      minor: 14,
      patch: 99,
    });
  });

  test("throws on an invalid version format", () => {
    expect(() => parseVersion("1.2")).toThrow("Invalid version format");
  });
});

describe("nextVersion", () => {
  test("increments the patch version below 99", () => {
    expect(nextVersion("0.0.2")).toBe("0.0.3");
  });

  test("rolls over 99 to the next minor version", () => {
    expect(nextVersion("0.0.99")).toBe("0.1.0");
  });
});

describe("getWorkspaceDirectory", () => {
  test("strips the manifest file suffix", () => {
    expect(getWorkspaceDirectory("packages/ui/package.json")).toBe(
      "packages/ui"
    );
  });
});

describe("getChangedWorkspaces", () => {
  const workspaces: WorkspacePackage[] = [
    {
      currentVersion: "0.0.1",
      directory: "apps/web",
      headVersion: "0.0.1",
      manifestPath: "apps/web/package.json",
      name: "@chorus/web",
    },
    {
      currentVersion: "0.0.1",
      directory: "packages/ui",
      headVersion: "0.0.1",
      manifestPath: "packages/ui/package.json",
      name: "@chorus/ui",
    },
  ];

  test("matches workspace changes by files inside the workspace", () => {
    expect(
      getChangedWorkspaces(workspaces, [
        "apps/web/app/page.tsx",
        "README.md",
      ]).map((workspace) => workspace.name)
    ).toEqual(["@chorus/web"]);
  });

  test("matches workspace changes by package manifest path", () => {
    expect(
      getChangedWorkspaces(workspaces, ["packages/ui/package.json"]).map(
        (workspace) => workspace.name
      )
    ).toEqual(["@chorus/ui"]);
  });
});

describe("getWorkspacesNeedingBump", () => {
  test("keeps only workspaces that still match HEAD or are new", () => {
    const changedWorkspaces: WorkspacePackage[] = [
      {
        currentVersion: "0.0.1",
        directory: "apps/web",
        headVersion: "0.0.1",
        manifestPath: "apps/web/package.json",
        name: "@chorus/web",
      },
      {
        currentVersion: "0.0.2",
        directory: "packages/ui",
        headVersion: "0.0.1",
        manifestPath: "packages/ui/package.json",
        name: "@chorus/ui",
      },
      {
        currentVersion: "0.0.1",
        directory: "packages/new",
        headVersion: null,
        manifestPath: "packages/new/package.json",
        name: "@chorus/new",
      },
    ];

    expect(
      getWorkspacesNeedingBump(changedWorkspaces).map(
        (workspace) => workspace.name
      )
    ).toEqual(["@chorus/web", "@chorus/new"]);
  });
});

describe("createTemporaryChangeset", () => {
  test("creates a patch changeset entry for each workspace", () => {
    expect(
      createTemporaryChangeset([
        {
          currentVersion: "0.0.1",
          directory: "apps/web",
          headVersion: "0.0.1",
          manifestPath: "apps/web/package.json",
          name: "@chorus/web",
        },
        {
          currentVersion: "0.0.1",
          directory: "packages/ui",
          headVersion: "0.0.1",
          manifestPath: "packages/ui/package.json",
          name: "@chorus/ui",
        },
      ])
    ).toContain(`"@chorus/web": patch\n"@chorus/ui": patch`);
  });
});

describe("shouldBumpRootVersion", () => {
  test("bumps when the root version still matches HEAD", () => {
    expect(
      shouldBumpRootVersion({
        currentVersion: "0.0.2",
        headRef: "abc123",
        headVersion: "0.0.2",
        state: null,
      })
    ).toBe(true);
  });

  test("bumps when the root had no version in HEAD", () => {
    expect(
      shouldBumpRootVersion({
        currentVersion: "0.0.1",
        headRef: "abc123",
        headVersion: null,
        state: null,
      })
    ).toBe(true);
  });

  test("does not bump again for the same HEAD after a prior bump", () => {
    expect(
      shouldBumpRootVersion({
        currentVersion: "0.0.2",
        headRef: "abc123",
        headVersion: "0.0.1",
        state: {
          head: "abc123",
          rootVersion: "0.0.2",
        },
      })
    ).toBe(false);
  });
});
