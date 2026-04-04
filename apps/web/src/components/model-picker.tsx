"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon, Command, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ProviderId = "anthropic" | "openai" | "google";

type ExplicitModelKey = "claude" | "gpt4_1" | "gemini";

export type ModelOptionKey = "default" | ExplicitModelKey;

export const MODEL_OPTIONS: Record<
  ModelOptionKey,
  { modelID: string; providerID: string } | undefined
> = {
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
};

const DEFAULT_MODEL = {
  description: "Use the board's default OpenCode routing.",
  label: "OpenCode Default",
  meta: "Automatic model selection",
};

const MODEL_CATALOG: Record<
  ExplicitModelKey,
  {
    description: string;
    label: string;
    meta: string;
    providerLabel: string;
    providerTab: ProviderId;
  }
> = {
  claude: {
    description: "Balanced Anthropic model for steady product work.",
    label: "Claude Sonnet 4.5",
    meta: "anthropic / claude-sonnet-4-5",
    providerLabel: "Anthropic",
    providerTab: "anthropic",
  },
  gpt4_1: {
    description: "General-purpose OpenAI model for precise task execution.",
    label: "GPT-4.1",
    meta: "openai / gpt-4.1",
    providerLabel: "OpenAI",
    providerTab: "openai",
  },
  gemini: {
    description: "Fast Google model with strong multimodal reasoning.",
    label: "Gemini 2.5 Pro",
    meta: "google / gemini-2.5-pro",
    providerLabel: "Google",
    providerTab: "google",
  },
};

const PROVIDER_TABS: Array<{
  id: ProviderId;
  label: string;
  modelKeys: ExplicitModelKey[];
}> = [
  {
    id: "anthropic",
    label: "Anthropic",
    modelKeys: ["claude"],
  },
  {
    id: "openai",
    label: "OpenAI",
    modelKeys: ["gpt4_1"],
  },
  {
    id: "google",
    label: "Google",
    modelKeys: ["gemini"],
  },
];

function getProviderForValue(value: ModelOptionKey) {
  if (value === "default") {
    return PROVIDER_TABS[0]?.id ?? "anthropic";
  }

  return MODEL_CATALOG[value].providerTab;
}

function getModelLabel(value: ModelOptionKey) {
  return value === "default" ? DEFAULT_MODEL.label : MODEL_CATALOG[value].label;
}

interface ModelPickerProps {
  className?: string;
  onValueChange: (value: ModelOptionKey) => void;
  value: ModelOptionKey;
}

export function ModelPicker({
  className,
  onValueChange,
  value,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderId>(
    getProviderForValue(value)
  );

  useEffect(() => {
    if (value !== "default") {
      setActiveProvider(MODEL_CATALOG[value].providerTab);
    }
  }, [value]);

  const selectedProvider =
    value === "default" ? "default" : MODEL_CATALOG[value].providerTab;
  const activeGroup =
    PROVIDER_TABS.find((provider) => provider.id === activeProvider) ??
    PROVIDER_TABS[0];

  const handleSelect = (nextValue: ModelOptionKey) => {
    onValueChange(nextValue);
    if (nextValue !== "default") {
      setActiveProvider(MODEL_CATALOG[nextValue].providerTab);
    }
    setOpen(false);
  };

  return (
    <Popover.Root onOpenChange={(nextOpen) => setOpen(nextOpen)} open={open}>
      <Popover.Trigger
        aria-label="Choose model"
        className={cn(
          "flex min-w-[11.5rem] max-w-[13.5rem] select-none items-center justify-between gap-2 whitespace-nowrap rounded-xs border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center text-white/70">
            <ProviderMark provider={selectedProvider} />
          </span>
          <span className="truncate text-left">{getModelLabel(value)}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-white/45" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          align="start"
          className="isolate z-50 outline-none"
          side="top"
          sideOffset={10}
        >
          <Popover.Popup className="w-[26rem] max-w-[calc(100vw-2rem)] origin-(--transform-origin) overflow-hidden rounded-xs border border-white/10 bg-[#141414]/98 text-white shadow-[0_20px_54px_rgba(0,0,0,0.52)] ring-1 ring-white/8 backdrop-blur-xl transition-[opacity,transform] duration-100 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-2 border-white/8 border-r bg-[#101010] px-2 py-2.5">
                {PROVIDER_TABS.map((provider) => {
                  const isActive = provider.id === activeProvider;

                  return (
                    <button
                      aria-label={provider.label}
                      aria-pressed={isActive}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-xs border border-white/6 bg-white/[0.02] text-white/38 outline-none transition-colors hover:border-white/12 hover:bg-white/[0.05] hover:text-white/75 focus-visible:border-white/14 focus-visible:bg-white/[0.08] focus-visible:text-white/88",
                        isActive &&
                          "border-white/12 bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      )}
                      key={provider.id}
                      onClick={() => setActiveProvider(provider.id)}
                      type="button"
                    >
                      <ProviderMark provider={provider.id} />
                      {isActive ? (
                        <span className="absolute bottom-0 left-1/2 h-px w-5 -translate-x-1/2 bg-white/35" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="flex min-h-[18rem] flex-col bg-[#161616] p-2.5">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div>
                    <div className="text-[10px] text-white/35 uppercase tracking-[0.22em]">
                      Model Routing
                    </div>
                    <div className="mt-1 text-[11px] text-white/50">
                      Provider-led picker with manual override.
                    </div>
                  </div>
                </div>

                <button
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xs border px-3 py-2.5 text-left outline-none transition-colors",
                    value === "default"
                      ? "border-white/14 bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "border-white/6 bg-white/[0.02] text-white/82 hover:border-white/12 hover:bg-white/[0.05] focus-visible:border-white/14 focus-visible:bg-white/[0.06]"
                  )}
                  onClick={() => handleSelect("default")}
                  type="button"
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xs border border-white/8 bg-black/20 text-white/72">
                    <Command className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-[12px] text-white">
                        {DEFAULT_MODEL.label}
                      </span>
                      {value === "default" ? (
                        <CheckIcon className="size-3.5 shrink-0 text-white/70" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/42">
                      {DEFAULT_MODEL.meta}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/56">
                      {DEFAULT_MODEL.description}
                    </span>
                  </span>
                </button>

                <div className="mt-3 flex items-center gap-2 px-1">
                  <span className="text-[10px] text-white/35 uppercase tracking-[0.22em]">
                    {activeGroup.label}
                  </span>
                  <span className="h-px flex-1 bg-white/8" />
                </div>

                <div className="mt-2 flex flex-col gap-1.5">
                  {activeGroup.modelKeys.map((modelKey) => {
                    const model = MODEL_CATALOG[modelKey];
                    const isSelected = value === modelKey;

                    return (
                      <button
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-xs border px-3 py-2.5 text-left outline-none transition-colors",
                          isSelected
                            ? "border-white/14 bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                            : "border-white/6 bg-white/[0.02] text-white/80 hover:border-white/12 hover:bg-white/[0.05] hover:text-white/92 focus-visible:border-white/14 focus-visible:bg-white/[0.06]"
                        )}
                        key={modelKey}
                        onClick={() => handleSelect(modelKey)}
                        type="button"
                      >
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xs border border-white/8 bg-black/20 text-white/72">
                          <ProviderMark provider={model.providerTab} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-[12px] text-white">
                              {model.label}
                            </span>
                            {isSelected ? (
                              <CheckIcon className="size-3.5 shrink-0 text-white/70" />
                            ) : null}
                          </span>
                          <span className="mt-1 block text-[11px] text-white/42 uppercase tracking-[0.12em]">
                            {model.providerLabel}
                          </span>
                          <span className="mt-1 block text-[11px] text-white/52">
                            {model.description}
                          </span>
                          <span className="mt-1 block truncate text-[10px] text-white/34">
                            {model.meta}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProviderMark({ provider }: { provider: ProviderId | "default" }) {
  if (provider === "default") {
    return <Command className="size-3.5" />;
  }

  if (provider === "anthropic") {
    return (
      <span className="font-semibold text-[10px] uppercase tracking-[-0.08em]">
        AI
      </span>
    );
  }

  if (provider === "google") {
    return <Sparkles className="size-3.5" />;
  }

  return <OpenAIMark />;
}

function OpenAIMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="4.5" fill="currentColor" r="2.25" />
      <circle cx="18.06" cy="8" fill="currentColor" r="2.25" />
      <circle cx="18.06" cy="16" fill="currentColor" r="2.25" />
      <circle cx="12" cy="19.5" fill="currentColor" r="2.25" />
      <circle cx="5.94" cy="16" fill="currentColor" r="2.25" />
      <circle cx="5.94" cy="8" fill="currentColor" r="2.25" />
      <circle cx="12" cy="12" fill="#141414" r="3.15" />
    </svg>
  );
}
