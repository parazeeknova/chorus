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

export function PromptInput() {
  const [prompt, setPrompt] = useState("");
  const [selectedKanban, setSelectedKanban] = useState("main");
  const [selectedModel, setSelectedModel] = useState("chorus");

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 flex justify-center px-4 pb-0">
      <div className="w-full max-w-4xl">
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
                    <SelectTrigger
                      className="h-auto w-auto border-0 p-0 text-xs shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ backgroundColor: "white" }}
                    >
                      <SelectValue style={{ backgroundColor: "white" }} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Kanban</SelectItem>
                      <SelectItem value="dev">Dev Tasks</SelectItem>
                      <SelectItem value="design">Design Board</SelectItem>
                      <SelectItem value="bugs">Bug Tracker</SelectItem>
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
