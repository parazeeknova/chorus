import posthog from "posthog-js";

interface FrecencyEntry {
  count: number;
  lastUsed: number;
  path: string;
}

const STORAGE_KEY = "chorus-frecency";
const MAX_ENTRIES = 1000;

function loadEntries(): Map<string, FrecencyEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Map();
    }
    const parsed: FrecencyEntry[] = JSON.parse(raw);
    return new Map(parsed.map((e) => [e.path, e]));
  } catch {
    return new Map();
  }
}

function saveEntries(entries: Map<string, FrecencyEntry>) {
  try {
    const arr = Array.from(entries.values())
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Storage full or unavailable
  }
}

function score(entry: FrecencyEntry): number {
  const daysSinceLastOpen =
    (Date.now() - entry.lastUsed) / (1000 * 60 * 60 * 24);
  return entry.count * (1 / (1 + daysSinceLastOpen));
}

export function recordFileUsage(path: string) {
  const entries = loadEntries();
  const existing = entries.get(path);
  if (existing) {
    existing.count += 1;
    existing.lastUsed = Date.now();
  } else {
    entries.set(path, { count: 1, lastUsed: Date.now(), path });
  }
  saveEntries(entries);
  posthog.capture("frecency_record", { path });
}

export function getFrecencyScore(path: string): number {
  const entries = loadEntries();
  const entry = entries.get(path);
  if (!entry) {
    return 0;
  }
  return score(entry);
}

export function boostByFrecency<T extends { id: string }>(items: T[]): T[] {
  return items
    .map((item) => {
      const frecencyScore = getFrecencyScore(item.id);
      return { item, frecencyScore };
    })
    .sort((a, b) => {
      const scoreDiff = b.frecencyScore - a.frecencyScore;
      if (Math.abs(scoreDiff) > 0.01) {
        return scoreDiff;
      }
      return 0;
    })
    .map(({ item }) => item);
}

export function clearFrecency() {
  localStorage.removeItem(STORAGE_KEY);
}
