"use client";

import { useEffect, useState } from "react";
import { fetchVoiceConfig, type GroqVoice } from "@/lib/voice-api";

interface VoiceConfigState {
  defaultModelId: string | null;
  defaultVoiceId: string | null;
  isLoading: boolean;
  voices: GroqVoice[];
}

export function useVoiceConfig(): VoiceConfigState {
  const [voices, setVoices] = useState<GroqVoice[]>([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null);
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetchVoiceConfig()
      .then((config) => {
        if (isCancelled) {
          return;
        }

        setVoices(config.voices);
        setDefaultVoiceId(config.defaultVoice);
        setDefaultModelId(config.defaultModel);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setVoices([]);
        setDefaultVoiceId(null);
        setDefaultModelId(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    voices,
    defaultVoiceId,
    defaultModelId,
    isLoading,
  };
}
