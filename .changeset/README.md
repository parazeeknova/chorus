# Changesets

This repo uses Changesets for versioning, with an automatic pre-commit flow.

Basic flow:

1. On `pre-commit`, Chorus detects staged workspace changes under `apps/*` and `packages/*`.
2. It generates a temporary Changesets patch file for only the changed workspaces that still match `HEAD`.
3. It runs `changeset version` to bump those workspace package versions.
4. It bumps the root `package.json` version on every commit.
5. It stages the updated version files automatically.

Manual commands are still available:

- `bun changeset`
- `bun run version-packages`
- `bun run release`
