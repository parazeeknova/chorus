const SLASH_REGEX = /\/(\w*)$/;
const AT_REGEX = /@([\w./]*)$/;

import posthog from "posthog-js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCommands,
  fetchDirectory,
  fetchFiles,
  fetchSkills,
} from "@/lib/opencode-client";

export type AutocompleteType = "command" | "skill" | "file" | null;

export interface AutocompleteItem {
  description?: string;
  id: string;
  label: string;
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
  isLoading: boolean;
  isOpen: boolean;
  items: AutocompleteItem[];
  state: AutocompleteState | null;
}

export function useAutocomplete(directory?: string): UseAutocompleteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<AutocompleteState | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchItems = useCallback(
    async (type: AutocompleteType, query: string) => {
      posthog.capture("autocomplete_fetch_start", {
        type,
        query,
        directory,
      });

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsLoading(true);

      try {
        let results: AutocompleteItem[] = [];

        if (type === "command" || type === "skill") {
          const [commands, skills] = await Promise.all([
            fetchCommands({ directory }),
            fetchSkills({ directory }),
          ]);

          posthog.capture("autocomplete_fetch_commands", {
            count: commands.length,
            commands: commands.map((c) => c.name),
          });
          posthog.capture("autocomplete_fetch_skills", {
            count: skills.length,
            skills: skills.map((s) => s.name),
          });

          const builtinCommands = [
            {
              name: "undo",
              description: "Revert the last agent action",
            },
            {
              name: "redo",
              description: "Restore previously reverted messages",
            },
          ];

          const commandResults = [
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
              .filter((cmd) =>
                cmd.name.toLowerCase().includes(query.toLowerCase())
              )
              .map((cmd) => ({
                id: `cmd:${cmd.name}`,
                label: `/${cmd.name}`,
                description: cmd.description ?? "",
                type: "command" as const,
              })),
          ];

          const skillResults = skills
            .filter((skill) =>
              skill.name.toLowerCase().includes(query.toLowerCase())
            )
            .map((skill) => ({
              id: `skill:${skill.name}`,
              label: `/${skill.name}`,
              description: skill.description ?? "",
              type: "skill" as const,
            }));

          results = [...commandResults, ...skillResults];
        } else if (type === "file") {
          if (query.includes("/")) {
            const dirPath = query.slice(0, query.lastIndexOf("/")) || "/";
            const files = await fetchDirectory(dirPath, { directory });
            posthog.capture("autocomplete_fetch_directory", {
              dirPath,
              count: files.length,
            });
            results = files
              .filter((file) =>
                file.name
                  .toLowerCase()
                  .includes(
                    query.slice(query.lastIndexOf("/") + 1).toLowerCase()
                  )
              )
              .map((file) => ({
                id: file.path,
                label: file.name,
                description: file.type === "directory" ? "Directory" : "File",
                type: "file" as const,
              }));
          } else {
            const files = await fetchFiles(query, { directory });
            posthog.capture("autocomplete_fetch_files", {
              query,
              count: files.length,
            });
            results = files
              .filter((file) =>
                file.toLowerCase().includes(query.toLowerCase())
              )
              .map((file) => ({
                id: file,
                label: file.split("/").pop() ?? file,
                description: file,
                type: "file" as const,
              }));
          }
        }

        posthog.capture("autocomplete_fetch_success", {
          type,
          resultCount: results.length,
        });
        setItems(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        posthog.capture("autocomplete_fetch_error", {
          type,
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

        fetchItems("command", query);
      } else if (atMatch) {
        const query = atMatch[1];
        const triggerIndex = cursorPos - atMatch[0].length;

        posthog.capture("autocomplete_trigger_detected", {
          trigger: "at",
          query,
          cursorPos,
          triggerIndex,
        });

        setState({
          type: "file",
          query,
          cursorPosition: cursorPos,
          triggerIndex,
        });

        fetchItems("file", query);
      } else {
        setState(null);
        setIsOpen(false);
        setItems([]);
      }
    },
    [fetchItems]
  );

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
  };
}
