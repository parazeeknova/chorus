import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    GROQ_API_KEY: z.string().optional(),
    GROQ_TTS_DEFAULT_MODEL_ID: z
      .string()
      .min(1)
      .default("canopylabs/orpheus-v1-english"),
    GROQ_TTS_DEFAULT_VOICE: z.string().min(1).default("hannah"),
    GROQ_STT_MODEL_ID: z.string().min(1).default("whisper-large-v3-turbo"),

    ARMORIQ_API_KEY: z.string().optional(),
    ARMORIQ_USER_ID: z.string().min(1).default("chorus-dev-user"),
    ARMORIQ_AGENT_ID: z.string().min(1).default("chorus-dev-agent"),
    ARMORIQ_PROXY_ENDPOINT: z.string().optional(),
    ARMORIQ_TIMEOUT: z.coerce.number().min(1).default(30_000),
    ARMORIQ_MAX_RETRIES: z.coerce.number().min(0).default(3),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
