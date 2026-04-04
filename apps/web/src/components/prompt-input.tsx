"use client";

import { ArrowUp, Mic, MoreHorizontal } from "lucide-react";
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
import { useVoiceRecording } from "@/hooks/use-voice-recording";

export function PromptInput() {
  const [prompt, setPrompt] = useState("");
  const [selectedKanban, setSelectedKanban] = useState("main");
  const [selectedModel, setSelectedModel] = useState("chorus");

  const handleTranscriptionComplete = (text: string) => {
    setPrompt((prev) => prev + (prev ? " " : "") + text);
  };

  const { isRecording, isTranscribing, startRecording, stopRecording } =
    useVoiceRecording(handleTranscriptionComplete);

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      return;
    }

    // TODO: Handle prompt submission
    console.log(
      "Prompt submitted:",
      prompt,
      "to kanban:",
      selectedKanban,
      "with model:",
      selectedModel
    );
    setPrompt("");
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    // Reset height to allow shrinking on delete
    e.target.style.height = "auto";
    // Set height to match content (scroll height)
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
      // Reset height after submit
      const target = e.target as HTMLTextAreaElement;
      target.style.height = "auto";
    }
  };

  return (
    <div className="fixed right-0 bottom-8 left-0 z-40 flex justify-center px-4">
      <div className="w-full max-w-3xl">
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
                    onValueChange={(value) => value && setSelectedModel(value)}
                    value={selectedModel}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-md border-0 bg-white/5 px-2.5 py-1 font-semibold text-white/70 text-xs shadow-none hover:bg-white/10 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-white/10 data-[state=open]:text-white dark:bg-white/5 dark:data-[state=open]:bg-white/10 dark:data-[state=open]:text-white dark:hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#161616] text-white/90">
                      <SelectItem value="chorus">Chorus</SelectItem>
                      <SelectItem value="gpt4">GPT-4</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => value && setSelectedKanban(value)}
                    value={selectedKanban}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 rounded-md border-0 bg-transparent px-2.5 py-1 font-medium text-white/50 text-xs shadow-none hover:bg-white/10 hover:text-white/80 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-white/10 data-[state=open]:text-white dark:bg-transparent dark:data-[state=open]:bg-white/10 dark:data-[state=open]:text-white dark:hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#161616] text-white/90">
                      <SelectItem value="main">Main Kanban</SelectItem>
                      <SelectItem value="dev">Dev Tasks</SelectItem>
                      <SelectItem value="design">Design Board</SelectItem>
                      <SelectItem value="bugs">Bug Tracker</SelectItem>
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
                    disabled={!prompt.trim()}
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
