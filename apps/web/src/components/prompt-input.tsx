"use client";

import {
  type ModelSelection,
  type OpencodeModelSummary,
  opencodeModelCatalogSchema,
} from "@chorus/contracts";
import { ArrowUp, Mic, MoreHorizontal, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import {
  createModelKey,
  DEFAULT_MODEL_KEY,
  ModelPicker,
} from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/features/workspace/workspace-context";
import {
  type AutocompleteItem,
  useAutocomplete,
} from "@/hooks/use-autocomplete";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { cn } from "@/lib/utils";
import { fetchVoiceConfig, type GroqVoice } from "@/lib/voice-api";

const composerSelectTriggerClass =
  "h-7 min-w-0 gap-1.5 rounded-xs border border-white/8 bg-white/[0.04] px-2.5 py-1 font-medium text-[11px] text-white/72 shadow-none transition-colors hover:border-white/14 hover:bg-white/[0.07] hover:text-white/90 focus-visible:border-white/16 focus-visible:bg-white/[0.08] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-40 dark:border-white/8 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]";

const composerSelectContentClass =
  "border-white/10 bg-[#151515]/96 p-1 text-white/92 shadow-[0_18px_44px_rgba(0,0,0,0.45)] backdrop-blur-xl";

const composerSelectItemClass =
  "min-h-8 rounded-xs px-2.5 py-1.5 text-[12px] text-white/78 focus:bg-white/7 focus:!text-white/86 focus:**:!text-white/86 aria-selected:bg-white/10 aria-selected:!text-white aria-selected:**:!text-white data-[highlighted]:bg-white/7 data-[highlighted]:!text-white/86 data-[highlighted]:**:!text-white/86";

export function PromptInput() {
  const [prompt, setPrompt] = useState("");
  const [selectedModelKey, setSelectedModelKey] = useState(DEFAULT_MODEL_KEY);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<
    OpencodeModelSummary[]
  >([]);
  const [defaultModel, setDefaultModel] = useState<
    ModelSelection | undefined
  >();
  const [selectedVoice, setSelectedVoice] = useState("hannah");
  const [voices, setVoices] = useState<GroqVoice[]>([]);
  const [textareaRect, setTextareaRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    boards,
    dismissComposerHint,
    isQueueingPrompt,
    preferences,
    queuePrompt,
    selectBoard,
    sessionCommand,
    selectedBoard,
  } = useWorkspace();

  const autocomplete = useAutocomplete(selectedBoard?.repo.directory);

  useEffect(() => {
    fetchVoiceConfig()
      .then((config) => {
        setVoices(config.voices);
        setSelectedVoice(config.defaultVoice);
      })
      .catch(() => {
        // Silently fail - voice config is optional
      });
  }, []);

  const isBusy =
    isQueueingPrompt || selectedBoard?.session.state === "starting";
  const hasActiveRun = selectedBoard?.session.currentTaskId !== undefined;
  const selectedDirectory = selectedBoard?.repo.directory ?? null;
  let sessionMessage = "First prompt will start a new OpenCode session.";

  if (hasActiveRun) {
    sessionMessage = "Wait for the current run to finish.";
  } else if (isBusy) {
    sessionMessage = "Starting session…";
  } else if (selectedBoard?.session.sessionId) {
    sessionMessage = "Prompt will reuse the active session.";
  }

  const handleTranscriptionComplete = (text: string) => {
    setPrompt((prev) => prev + (prev ? " " : "") + text);
  };

  const { isRecording, isTranscribing, startRecording, stopRecording } =
    useVoiceRecording(handleTranscriptionComplete);

  useEffect(() => {
    let isCancelled = false;

    async function loadModels() {
      setIsLoadingModels(true);

      try {
        const query = selectedDirectory
          ? `?directory=${encodeURIComponent(selectedDirectory)}`
          : "";
        const response = await fetch(`/api/models${query}`, {
          cache: "no-store",
        });

        if (!response.ok || isCancelled) {
          return;
        }

        const payload = opencodeModelCatalogSchema.parse(await response.json());
        if (isCancelled) {
          return;
        }

        setAvailableModels(payload.models);
        setDefaultModel(payload.defaultModel);
        setSelectedModelKey((currentValue) =>
          currentValue === DEFAULT_MODEL_KEY ||
          payload.models.some((model) => createModelKey(model) === currentValue)
            ? currentValue
            : DEFAULT_MODEL_KEY
        );
      } catch (error) {
        console.error("Failed to load OpenCode models", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingModels(false);
        }
      }
    }

    loadModels().catch((error) => {
      console.error("Failed to load OpenCode models", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedDirectory]);

  const selectedModel = useMemo(() => {
    if (selectedModelKey === DEFAULT_MODEL_KEY) {
      return undefined;
    }

    const [providerID, modelID] = selectedModelKey.split("/");
    if (!(providerID && modelID)) {
      return undefined;
    }

    return {
      providerID,
      modelID,
    } satisfies ModelSelection;
  }, [selectedModelKey]);

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(prompt.trim() && selectedBoard) || isBusy || hasActiveRun) {
      return;
    }

    const result = await queuePrompt({
      text: prompt.trim(),
      model: selectedModel,
    });

    if (result) {
      setPrompt("");
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    const cursorPos = e.target.selectionStart;
    autocomplete.checkTrigger(e.target.value, cursorPos);

    if (autocomplete.isOpen) {
      const rect = e.target.getBoundingClientRect();
      setTextareaRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleSelectAutocomplete = useCallback(
    async (item: AutocompleteItem) => {
      if (item.id.startsWith("builtin:")) {
        const command = item.id.replace("builtin:", "") as "undo" | "redo";
        const success = await sessionCommand(command);
        if (success) {
          autocomplete.close();
          setTextareaRect(null);
          setPrompt("");
        }
        return;
      }

      if (!(textareaRef.current && autocomplete.state)) {
        return;
      }

      const textarea = textareaRef.current;
      const { triggerIndex, cursorPosition } = autocomplete.state;

      const before = prompt.slice(0, triggerIndex);
      const after = prompt.slice(cursorPosition);
      const insertText =
        item.type === "file" ? `@${item.id} ` : `${item.label} `;

      const newPrompt = before + insertText + after;
      setPrompt(newPrompt);

      autocomplete.close();
      setTextareaRect(null);

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = triggerIndex + insertText.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [prompt, autocomplete, sessionCommand]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.isOpen && e.key === "Escape") {
      e.preventDefault();
      autocomplete.close();
      setTextareaRect(null);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e).catch((error) => {
        console.error("Failed to submit prompt", error);
      });
      const target = e.target as HTMLTextAreaElement;
      target.style.height = "auto";
    }
  };

  return (
    <div className="fixed right-0 bottom-8 left-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-3xl">
        {!preferences.composerHintDismissed && (
          <div className="mb-2 flex items-start justify-between gap-3 rounded-xs border border-white/10 bg-black/45 px-3 py-2 text-[11px] text-white/70 leading-4 shadow-lg backdrop-blur-md">
            <span>
              Boards persist across browsers on this machine.{" "}
              {selectedBoard
                ? `${selectedBoard.title} is selected. ${sessionMessage}`
                : "Open or select a board, then send the first prompt to start its OpenCode session."}
            </span>
            <button
              aria-label="Dismiss composer hint"
              className="rounded-xs p-0.5 text-white/35 transition-colors hover:bg-white/8 hover:text-white/70"
              onClick={dismissComposerHint}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}
        <form className="relative" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-sm border border-white/10 bg-[#0f0f0f]/90 p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-colors focus-within:border-white/20 focus-within:bg-[#161616]/95">
            <div className="flex flex-col gap-2 px-3 py-2">
              <Textarea
                className="max-h-[160px] min-h-8 w-full resize-none overflow-y-auto rounded-none border-0 bg-transparent p-0 font-medium text-[15px] text-white/90 shadow-none placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask Chorus to build something..."
                ref={textareaRef}
                rows={1}
                value={prompt}
              />
              <div className="flex items-center justify-between opacity-80 transition-opacity focus-within:opacity-100">
                <div className="flex items-center gap-2">
                  <ModelPicker
                    availableModels={availableModels}
                    className={composerSelectTriggerClass}
                    defaultModel={defaultModel}
                    loading={isLoadingModels}
                    onValueChange={setSelectedModelKey}
                    value={selectedModelKey}
                  />
                  {voices.length > 0 && (
                    <Select
                      onValueChange={(value) =>
                        value && setSelectedVoice(value)
                      }
                      value={selectedVoice}
                    >
                      <SelectTrigger
                        className={cn(
                          composerSelectTriggerClass,
                          "text-white/64"
                        )}
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        align="start"
                        className={cn("min-w-52", composerSelectContentClass)}
                      >
                        {voices.map((voice) => (
                          <SelectItem
                            className={composerSelectItemClass}
                            key={voice.id}
                            value={voice.id}
                          >
                            {voice.name} ({voice.gender})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => value && selectBoard(value)}
                    value={selectedBoard?.boardId ?? null}
                  >
                    <SelectTrigger
                      className={cn(
                        composerSelectTriggerClass,
                        "bg-transparent text-white/58"
                      )}
                      size="sm"
                    >
                      <SelectValue placeholder="Select a board" />
                    </SelectTrigger>
                    <SelectContent
                      align="end"
                      className={cn("min-w-64", composerSelectContentClass)}
                    >
                      {boards.map((board) => (
                        <SelectItem
                          className={composerSelectItemClass}
                          key={board.boardId}
                          value={board.boardId}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{board.title}</span>
                            <span className="truncate text-[11px] text-white/40">
                              {board.repo.branch ?? board.repo.directory}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className={`h-7 w-7 rounded-xs hover:text-white/90 dark:hover:text-white/90 ${
                      isRecording
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                        : "text-white/50 hover:bg-white/10 dark:text-white/50 dark:hover:bg-white/10"
                    }`}
                    disabled={isTranscribing}
                    onClick={handleVoiceButtonClick}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Mic
                      className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`}
                    />
                  </Button>
                  <Button
                    className="h-7 w-7 rounded-xs text-white/50 hover:bg-white/10 hover:text-white/90 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/90"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <button
                    className="h-7 w-7 rounded-xs bg-[#0f0f0f]/90 text-white/70 shadow-none transition-colors hover:bg-[#161616]/95 hover:text-white/90 focus:outline-none disabled:opacity-30"
                    disabled={
                      !(prompt.trim() && selectedBoard) ||
                      isBusy ||
                      hasActiveRun
                    }
                    type="submit"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
        <CommandPalette
          anchorRect={textareaRect}
          isLoading={autocomplete.isLoading}
          items={autocomplete.items}
          onClose={() => {
            autocomplete.close();
            setTextareaRect(null);
          }}
          onSelect={handleSelectAutocomplete}
        />
      </div>
    </div>
  );
}
