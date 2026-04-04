"use client";

import {
  type ModelSelection,
  type OpencodeModelSummary,
  opencodeModelCatalogSchema,
} from "@chorus/contracts";
import { ArrowUp, Mic, MoreHorizontal, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { useVoiceRecording } from "@/hooks/use-voice-recording";

const DEFAULT_MODEL_KEY = "default";

function createModelKey(model: ModelSelection) {
  return `${model.providerID}/${model.modelID}`;
}

export function PromptInput() {
  const [prompt, setPrompt] = useState("");
  const [selectedModelKey, setSelectedModelKey] = useState(DEFAULT_MODEL_KEY);
  const [availableModels, setAvailableModels] = useState<
    OpencodeModelSummary[]
  >([]);
  const [defaultModel, setDefaultModel] = useState<
    ModelSelection | undefined
  >();
  const {
    boards,
    dismissComposerHint,
    isQueueingPrompt,
    preferences,
    queuePrompt,
    selectedBoard,
    selectBoard,
  } = useWorkspace();

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
        setSelectedModelKey(DEFAULT_MODEL_KEY);
      } catch (error) {
        console.error("Failed to load OpenCode models", error);
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

  const defaultModelSummary = useMemo(() => {
    if (!defaultModel) {
      return null;
    }

    return (
      availableModels.find(
        (model) =>
          model.providerID === defaultModel.providerID &&
          model.modelID === defaultModel.modelID
      ) ?? null
    );
  }, [availableModels, defaultModel]);
  let defaultModelTitle = "Auto · OpenCode selection";
  let defaultModelDescription = "Uses OpenCode's current model resolution";

  if (availableModels.length === 0) {
    defaultModelTitle = "No OpenCode models available";
    defaultModelDescription = "Use Settings -> OpenCode to connect a provider";
  } else if (defaultModelSummary) {
    defaultModelTitle = `Auto · ${defaultModelSummary.name}`;
  }

  if (availableModels.length > 0 && defaultModel) {
    defaultModelDescription = `${defaultModel.providerID}/${defaultModel.modelID}`;
  }

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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
          <div className="mb-2 flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[11px] text-white/70 leading-4 shadow-lg backdrop-blur-md">
            <span>
              Boards persist across browsers on this machine.{" "}
              {selectedBoard
                ? `${selectedBoard.title} is selected. ${sessionMessage}`
                : "Open or select a board, then send the first prompt to start its OpenCode session."}
            </span>
            <button
              aria-label="Dismiss composer hint"
              className="rounded-md p-0.5 text-white/35 transition-colors hover:bg-white/8 hover:text-white/70"
              onClick={dismissComposerHint}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}
        <form className="relative" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f]/90 p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-colors focus-within:border-white/20 focus-within:bg-[#161616]/95">
            <div className="flex flex-col gap-2 px-3 py-2">
              <Textarea
                className="max-h-[160px] min-h-8 w-full resize-none overflow-y-auto rounded-none border-0 bg-transparent p-0 font-medium text-[15px] text-white/90 shadow-none placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask Chorus to build something..."
                rows={1}
                value={prompt}
              />
              <div className="flex items-center justify-between opacity-80 transition-opacity focus-within:opacity-100">
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) =>
                      value && setSelectedModelKey(value)
                    }
                    value={selectedModelKey}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-md border-0 bg-white/5 px-2.5 py-1 font-semibold text-white/70 text-xs shadow-none hover:bg-white/10 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-white/10 data-[state=open]:text-white dark:bg-white/5 dark:data-[state=open]:bg-white/10 dark:data-[state=open]:text-white dark:hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#161616] text-white/90">
                      <SelectItem value={DEFAULT_MODEL_KEY}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{defaultModelTitle}</span>
                          <span className="truncate text-[11px] text-white/40">
                            {defaultModelDescription}
                          </span>
                        </span>
                      </SelectItem>
                      {availableModels.map((model) => (
                        <SelectItem
                          key={`${model.providerID}/${model.modelID}`}
                          value={createModelKey(model)}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{model.name}</span>
                            <span className="truncate text-[11px] text-white/40">
                              {model.providerName} · {model.providerID}/
                              {model.modelID}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => value && selectBoard(value)}
                    value={selectedBoard?.boardId ?? null}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-md border-0 bg-transparent px-2.5 py-1 font-medium text-white/50 text-xs shadow-none hover:bg-white/10 hover:text-white/80 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-white/10 data-[state=open]:text-white dark:bg-transparent dark:data-[state=open]:bg-white/10 dark:data-[state=open]:text-white dark:hover:bg-white/10">
                      <SelectValue placeholder="Select a board" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#161616] text-white/90">
                      {boards.map((board) => (
                        <SelectItem key={board.boardId} value={board.boardId}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{board.title}</span>
                            <span className="truncate text-[11px] text-white/40">
                              {board.repo.directory}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className={`h-7 w-7 rounded-md hover:text-white/90 dark:hover:text-white/90 ${
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
                    className="h-7 w-7 rounded-md text-white/50 hover:bg-white/10 hover:text-white/90 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/90"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <Button
                    className="h-7 w-7 rounded-md bg-white text-black shadow-none transition-transform hover:bg-white/90 focus:ring-0 active:scale-95 disabled:scale-100 disabled:opacity-30 disabled:hover:bg-white dark:bg-white dark:text-black dark:hover:bg-white/90"
                    disabled={
                      !(prompt.trim() && selectedBoard) ||
                      isBusy ||
                      hasActiveRun
                    }
                    size="icon"
                    type="submit"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
