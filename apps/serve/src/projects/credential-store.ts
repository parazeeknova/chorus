import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type {
  OpencodeCredentialCatalog,
  OpencodeCredentialSummary,
} from "@chorus/contracts";

interface StoredCredentialRecord {
  type?: "api" | "oauth" | "wellknown";
}

export class OpenCodeCredentialStore {
  readonly #authPath = path.join(
    homedir(),
    ".local",
    "share",
    "opencode",
    "auth.json"
  );

  async listCredentials(): Promise<OpencodeCredentialCatalog> {
    try {
      const raw = await readFile(this.#authPath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, StoredCredentialRecord>;

      const credentials: OpencodeCredentialSummary[] = Object.entries(parsed)
        .flatMap(([id, value]) =>
          value.type
            ? [
                {
                  id,
                  type: value.type,
                },
              ]
            : []
        )
        .sort((left, right) => left.id.localeCompare(right.id));

      return { credentials };
    } catch {
      return { credentials: [] };
    }
  }
}
