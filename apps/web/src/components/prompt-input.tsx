"use client";

import { ArrowUp, Mic, MoreHorizontal, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
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
import { fetchVoiceConfig, type GroqVoice } from "@/lib/voice-api";

const MODEL_OPTIONS = {
  default: undefined,
  claude: {
    providerID: "anthropic",
    modelID: "claude-sonnet-4-5",
  },
  gpt4_1: {
    providerID: "openai",
    modelID: "gpt-4.1",
  },
  gemini: {
    providerID: "google",
    modelID: "gemini-2.5-pro",
  },
} as const;

export function PromptInput() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<keyof typeof MODEL_OPTIONS>("default");
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
      model: MODEL_OPTIONS[selectedModel],
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
                ref={textareaRef}
                rows={1}
                value={prompt}
              />
              <div className="flex items-center justify-between opacity-80 transition-opacity focus-within:opacity-100">
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => value && setSelectedModel(value)}
                    value={selectedModel}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-md border-0 bg-white/5 px-2.5 py-1 font-semibold text-white/70 text-xs shadow-none hover:bg-white/10 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-white/10 data-[state=open]:text-white dark:bg-white/5 dark:data-[state=open]:bg-white/10 dark:data-[state=open]:text-white dark:hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#161616] text-white/90">
                      <SelectItem value="default">OpenCode Default</SelectItem>
                      <SelectItem value="claude">Claude Sonnet 4.5</SelectItem>
                      <SelectItem value="gpt4_1">GPT-4.1</SelectItem>
                      <SelectItem value="gemini">Gemini 2.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  {voices.length > 0 && (
                    <Select
                      onValueChange={(value) =>
                        value && setSelectedVoice(value)
                      }
                      value={selectedVoice}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 rounded-md border-0 bg-white/5 px-2.5 py-1 font-medium text-white/60 text-xs shadow-none hover:bg-white/10 hover:text-white/80 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-white/10 data-[state=open]:text-white dark:bg-white/5 dark:data-[state=open]:bg-white/10 dark:data-[state=open]:text-white dark:hover:bg-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#161616] text-white/90">
                        {voices.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
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
