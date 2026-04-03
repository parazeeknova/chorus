import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    ELEVENLABS_API_KEY: z.string().min(1),
    ELEVENLABS_DEFAULT_VOICE_ID: z
      .string()
      .min(1)
      .default("Xb7hH8MSUJpSbSDYk0k2"),
    ELEVENLABS_DEFAULT_MODEL_ID: z
      .string()
      .min(1)
      .default("eleven_multilingual_v2"),
    ELEVENLABS_OUTPUT_FORMAT: z.string().min(1).default("mp3_44100_128"),
    ELEVENLABS_STT_MODEL_ID: z.string().min(1).default("scribe_v1"),

    ARMORIQ_API_KEY: z.string().min(1),
    ARMORIQ_USER_ID: z.string().min(1).default("chorus-dev-user"),
    ARMORIQ_AGENT_ID: z.string().min(1).default("chorus-dev-agent"),
    ARMORIQ_PROXY_ENDPOINT: z.string().optional(),
    ARMORIQ_TIMEOUT: z.coerce.number().min(1).default(30_000),
    ARMORIQ_MAX_RETRIES: z.coerce.number().min(0).default(3),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
