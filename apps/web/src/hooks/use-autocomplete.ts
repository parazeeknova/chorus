import fuzzysort from "fuzzysort";
import posthog from "posthog-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { boostByFrecency, recordFileUsage } from "@/lib/frecency";
import { removeLineRange } from "@/lib/line-range";
import {
  fetchCommands,
  fetchDirectory,
  fetchFiles,
  fetchSkills,
  type OpencodeCommand,
  type OpencodeFileNode,
  type OpencodeSkill,
} from "@/lib/opencode-client";

export type AutocompleteType = "command" | "skill" | "file" | null;

export interface AutocompleteItem {
  description?: string;
  id: string;
  isDirectory?: boolean;
  label: string;
  path?: string;
  type: AutocompleteType;
}

interface AutocompleteState {
  cursorPosition: number;
  query: string;
  triggerIndex: number;
  type: AutocompleteType;
}

interface UseAutocompleteReturn {
  checkTrigger: (value: string, cursorPos: number) => void;
  close: () => void;
  expandDirectory: (item: AutocompleteItem) => void;
  isLoading: boolean;
  isOpen: boolean;
  items: AutocompleteItem[];
  onItemSelect: (item: AutocompleteItem) => void;
  state: AutocompleteState | null;
}

const SLASH_REGEX = /\/(\w*)$/;
const AT_REGEX = /@([^\s]*)$/;

function fuzzyMatchFiles(
  items: AutocompleteItem[],
  query: string
): AutocompleteItem[] {
  if (!query) {
    return items;
  }

  const targets = items.map((item) => ({
    item,
    displayValue: item.path ?? item.label,
    description: item.description ?? "",
  }));

  const results = fuzzysort.go(query, targets, {
    keys: ["displayValue", "description"],
    limit: 50,
    threshold: -10_000,
  });

  return results.map((r) => r.obj.item);
}

function sortFilesByDepthAndFrecency(
  items: AutocompleteItem[]
): AutocompleteItem[] {
  const withDepth = items.map((item) => ({
    item,
    depth: (item.path ?? item.label).split("/").filter(Boolean).length,
  }));

  withDepth.sort((a, b) => {
    if (a.item.isDirectory !== b.item.isDirectory) {
      return a.item.isDirectory ? -1 : 1;
    }
    const depthDiff = a.depth - b.depth;
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return a.item.label.localeCompare(b.item.label);
  });

  return boostByFrecency(withDepth.map((d) => d.item));
}

export function useAutocomplete(directory?: string): UseAutocompleteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<AutocompleteState | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const fetchFileItems = useCallback(
    async (query: string, dirPath?: string) => {
      posthog.capture("autocomplete_fetch_start", {
        type: "file",
        query,
        directory,
      });

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsLoading(true);

      try {
        let rawItems: AutocompleteItem[] = [];

        if (dirPath || query.includes("/")) {
          const pathToFetch =
            dirPath ?? query.slice(0, query.lastIndexOf("/") + 1);
          const nodes = await fetchDirectory(pathToFetch || "/", { directory });
          posthog.capture("autocomplete_fetch_directory", {
            dirPath: pathToFetch,
            count: nodes.length,
          });

          const filterTerm = dirPath
            ? ""
            : query.slice(query.lastIndexOf("/") + 1);

          rawItems = nodes
            .filter((node: OpencodeFileNode) => {
              if (!filterTerm) {
                return true;
              }
              return node.name.toLowerCase().includes(filterTerm.toLowerCase());
            })
            .map((node: OpencodeFileNode) => ({
              id: node.path,
              label: node.name,
              description: node.type === "directory" ? "Directory" : "File",
              type: "file" as const,
              isDirectory: node.type === "directory",
              path: node.path,
            }));
        } else {
          const cleanQuery = removeLineRange(query);
          const files = await fetchFiles(cleanQuery, { directory });
          posthog.capture("autocomplete_fetch_files", {
            query: cleanQuery,
            count: files.length,
          });

          rawItems = files.map((file: string) => ({
            id: file,
            label: file.split("/").pop() ?? file,
            description: file,
            type: "file" as const,
            isDirectory: false,
            path: file,
          }));
        }

        const fuzzyResults = fuzzyMatchFiles(rawItems, query.replace("#", ""));
        const sortedResults = sortFilesByDepthAndFrecency(fuzzyResults);

        posthog.capture("autocomplete_fetch_success", {
          type: "file",
          resultCount: sortedResults.length,
        });
        setItems(sortedResults);
        setIsOpen(sortedResults.length > 0);
      } catch (error) {
        posthog.capture("autocomplete_fetch_error", {
          type: "file",
          query,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : typeof error,
        });
        setItems([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [directory]
  );

  const fetchCommandItems = useCallback(
    async (query: string) => {
      posthog.capture("autocomplete_fetch_start", {
        type: "command",
        query,
        directory,
      });

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsLoading(true);

      try {
        const [commands, skills] = await Promise.all([
          fetchCommands({ directory }),
          fetchSkills({ directory }),
        ]);

        posthog.capture("autocomplete_fetch_commands", {
          count: commands.length,
          commands: commands.map((c: OpencodeCommand) => c.name),
        });
        posthog.capture("autocomplete_fetch_skills", {
          count: skills.length,
          skills: skills.map((s: OpencodeSkill) => s.name),
        });

        const builtinCommands = [
          { name: "undo", description: "Revert the last agent action" },
          { name: "redo", description: "Restore previously reverted messages" },
        ];

        const allItems = [
          ...builtinCommands
            .filter((cmd) =>
              cmd.name.toLowerCase().includes(query.toLowerCase())
            )
            .map((cmd) => ({
              id: `builtin:${cmd.name}`,
              label: `/${cmd.name}`,
              description: cmd.description,
              type: "command" as const,
            })),
          ...commands
            .filter((cmd: OpencodeCommand) =>
              cmd.name.toLowerCase().includes(query.toLowerCase())
            )
            .map((cmd: OpencodeCommand) => ({
              id: `cmd:${cmd.name}`,
              label: `/${cmd.name}`,
              description: cmd.description ?? "",
              type: "command" as const,
            })),
          ...skills
            .filter((skill: OpencodeSkill) =>
              skill.name.toLowerCase().includes(query.toLowerCase())
            )
            .map((skill: OpencodeSkill) => ({
              id: `skill:${skill.name}`,
              label: `/${skill.name}`,
              description: skill.description ?? "",
              type: "skill" as const,
            })),
        ];

        const fuzzyResults = fuzzysort.go(query.toLowerCase(), allItems, {
          keys: ["label", "description"],
          limit: 50,
          threshold: -10_000,
        });

        const results = fuzzyResults.map((r) => r.obj);

        posthog.capture("autocomplete_fetch_success", {
          type: "command",
          resultCount: results.length,
        });
        setItems(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        posthog.capture("autocomplete_fetch_error", {
          type: "command",
          query,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : typeof error,
        });
        setItems([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [directory]
  );

  const checkTrigger = useCallback(
    (value: string, cursorPos: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const textBeforeCursor = value.slice(0, cursorPos);

      const slashMatch = textBeforeCursor.match(SLASH_REGEX);
      const atMatch = textBeforeCursor.match(AT_REGEX);

      if (slashMatch) {
        const query = slashMatch[1];
        const triggerIndex = cursorPos - slashMatch[0].length;

        posthog.capture("autocomplete_trigger_detected", {
          trigger: "slash",
          query,
          cursorPos,
          triggerIndex,
        });

        setState({
          type: null,
          query,
          cursorPosition: cursorPos,
          triggerIndex,
        });

        fetchCommandItems(query);
      } else if (atMatch) {
        const rawQuery = atMatch[1];
        const triggerIndex = cursorPos - atMatch[0].length;

        posthog.capture("autocomplete_trigger_detected", {
          trigger: "at",
          query: rawQuery,
          cursorPos,
          triggerIndex,
        });

        setState({
          type: "file",
          query: rawQuery,
          cursorPosition: cursorPos,
          triggerIndex,
        });

        fetchFileItems(rawQuery);
      } else {
        setState(null);
        setIsOpen(false);
        setItems([]);
      }
    },
    [fetchCommandItems, fetchFileItems]
  );

  const expandDirectory = useCallback(
    (item: AutocompleteItem) => {
      if (!(item.isDirectory && item.path)) {
        return;
      }

      const currentState = stateRef.current;
      if (!currentState) {
        return;
      }

      fetchFileItems(`${item.path}/`, item.path);
    },
    [fetchFileItems]
  );

  const onItemSelect = useCallback((item: AutocompleteItem) => {
    if (item.type === "file" && item.path) {
      recordFileUsage(item.path);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setState(null);
    setItems([]);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    isOpen,
    items,
    isLoading,
    state,
    checkTrigger,
    close,
    expandDirectory,
    onItemSelect,
  };
}
