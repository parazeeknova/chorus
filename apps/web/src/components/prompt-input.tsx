"use client";

import { ArrowUp, MoreHorizontal } from "lucide-react";
import { useState } from "react";
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
  const { boards, isQueueingPrompt, queuePrompt, selectedBoard, selectBoard } =
    useWorkspace();

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e).catch((error) => {
        console.error("Failed to submit prompt", error);
      });
    }
  };

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-0">
      <div className="w-full max-w-4xl">
        <div className="mb-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[11px] text-white/70 leading-4 shadow-lg backdrop-blur-md">
          Boards persist locally across refresh.{" "}
          {selectedBoard
            ? `${selectedBoard.title} is selected. ${sessionMessage}`
            : "Open or select a board, then send the first prompt to start its OpenCode session."}
        </div>
        <form className="relative" onSubmit={handleSubmit}>
          <div className="rounded-t-2xl border-zinc-400/20 border-t-[6px] border-r-[6px] border-l-[6px] p-0.5 shadow-lg backdrop-blur-md">
            <div className="rounded-t-lg border-zinc-400 border-t border-r border-l bg-white px-4 py-3">
              <Textarea
                className="min-h-6 w-full resize-none rounded-none border-0 p-0 text-sm placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                rows={1}
                style={{ backgroundColor: "white" }}
                value={prompt}
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Select
                    onValueChange={(value) => value && setSelectedModel(value)}
                    value={selectedModel}
                  >
                    <SelectTrigger
                      className="h-auto w-auto border-0 p-0 font-medium shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ backgroundColor: "white" }}
                    >
                      <SelectValue style={{ backgroundColor: "white" }} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">OpenCode Default</SelectItem>
                      <SelectItem value="claude">Claude Sonnet</SelectItem>
                      <SelectItem value="gpt4_1">GPT-4.1</SelectItem>
                      <SelectItem value="gemini">Gemini 2.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => value && selectBoard(value)}
                    value={selectedBoard?.boardId ?? null}
                  >
                    <SelectTrigger
                      className="h-auto w-auto border-0 p-0 text-xs shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ backgroundColor: "white" }}
                    >
                      <SelectValue
                        placeholder="Select a board"
                        style={{ backgroundColor: "white" }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map((board) => (
                        <SelectItem key={board.boardId} value={board.boardId}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{board.title}</span>
                            <span className="truncate text-[11px] text-zinc-500">
                              {board.repo.directory}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="h-8 w-8 rounded-md text-zinc-600 hover:bg-zinc-100"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <Button
                    className="h-8 w-8 rounded-md bg-black text-white hover:bg-zinc-800 disabled:opacity-30"
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
