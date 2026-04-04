import { createLogger } from "@chorus/logger";
import {
  GROQ_TTS_VOICES,
  VoiceNotificationRequestSchema,
  type VoiceSettings,
} from "@chorus/voice";
import { Elysia, t } from "elysia";
import { VoiceService } from "../bridge/voice";
import {
  buildNotificationMessage,
  shouldPlayNotification,
} from "../bridge/voice/message-builder";
import { env } from "../config/env";

const logger = createLogger(
  {
    env: process.env.NODE_ENV === "production" ? "production" : "development",
  },
  "VOICE-ROUTE"
);

const UNAVAILABLE = {
  error: "Voice service not configured. Set GROQ_API_KEY to enable.",
  timestamp: new Date().toISOString(),
} as const;

let voiceService: VoiceService | undefined;

function getVoiceService(): VoiceService | null {
  if (!voiceService) {
    if (!env.GROQ_API_KEY) {
      return null;
    }
    voiceService = new VoiceService();
  }
  return voiceService;
}

const defaultSettings: VoiceSettings = {
  muteAll: false,
  mobileOnly: false,
  desktopOnly: false,
  approvalsOnly: false,
  failuresOnly: false,
  narrationMode: "concise",
};

export const voiceRoutes = new Elysia({ prefix: "/voice" })
  .post(
    "/notify",
    async ({ body }) => {
      const svc = getVoiceService();
      if (!svc) {
        return { ...UNAVAILABLE, accepted: false };
      }

      if (!shouldPlayNotification(defaultSettings, body.type)) {
        return {
          accepted: false,
          reason: "notification filtered by settings",
          timestamp: new Date().toISOString(),
        };
      }

      const text = buildNotificationMessage(
        body.type,
        defaultSettings,
        body.text
      );

      const result = await svc.generateSpeech({
        ...body,
        text,
      });

      return {
        accepted: result.status === "generated",
        notificationId: result.id,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    },
    {
      body: VoiceNotificationRequestSchema.extend({
        text: VoiceNotificationRequestSchema.shape.text.optional(),
      }),
    }
  )
  .post(
    "/tts",
    async ({ body, set }) => {
      const svc = getVoiceService();
      if (!svc) {
        set.status = 503;
        return { ...UNAVAILABLE, accepted: false };
      }

      const result = await svc.generateSpeech(body);

      if (result.status === "failed") {
        set.status = 502;
        return {
          accepted: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        accepted: true,
        notificationId: result.id,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        timestamp: new Date().toISOString(),
      };
    },
    {
      body: VoiceNotificationRequestSchema,
    }
  )
  .post(
    "/stt",
    async ({ body }) => {
      const { audio, modelId, diarize, mimeType, filename } = body;

      logger.info("stt-route-received", {
        audioLength: audio.length,
        modelId,
        diarize,
        mimeType,
        filename,
      });

      const audioBytes = Buffer.from(audio, "base64");
      const audioBuffer = audioBytes.buffer.slice(
        audioBytes.byteOffset,
        audioBytes.byteOffset + audioBytes.byteLength
      ) as ArrayBuffer;

      const detectedMimeType = mimeType ?? detectMimeType(audioBuffer);

      logger.info("stt-route-processing", {
        audioBufferSize: audioBuffer.byteLength,
        detectedMimeType,
      });

      const svc = getVoiceService();
      if (!svc) {
        logger.error("stt-route-no-service");
        return UNAVAILABLE;
      }

      const result = await svc.transcribeSpeech({
        audioBuffer,
        modelId,
        diarize: diarize ?? false,
        mimeType: detectedMimeType,
        filename,
      });

      logger.info("stt-route-result", {
        text: result.text,
        textLength: result.text?.length,
        wordCount: result.words?.length,
        confidence: result.confidence,
      });

      return {
        text: result.text,
        confidence: result.confidence,
        words: result.words,
        timestamp: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        audio: t.String(),
        modelId: t.Optional(t.String()),
        diarize: t.Optional(t.Boolean()),
        mimeType: t.Optional(t.String()),
        filename: t.Optional(t.String()),
      }),
    }
  )
  .get("/voices", () => ({
    voices: GROQ_TTS_VOICES,
    defaultVoice: env.GROQ_TTS_DEFAULT_VOICE,
    defaultModel: env.GROQ_TTS_DEFAULT_MODEL_ID,
    timestamp: new Date().toISOString(),
  }))
  .get("/health", () => ({
    status: env.GROQ_API_KEY ? "ok" : "unconfigured",
    service: "voice",
    provider: "groq",
    timestamp: new Date().toISOString(),
  }));

function detectMimeType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) {
    return "audio/wav";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return "audio/wav";
  }
  if (
    bytes[0] === 0x4f &&
    bytes[1] === 0x67 &&
    bytes[2] === 0x67 &&
    bytes[3] === 0x53
  ) {
    return "audio/ogg";
  }
  if (
    bytes[0] === 0x66 &&
    bytes[1] === 0x4c &&
    bytes[2] === 0x61 &&
    bytes[3] === 0x43
  ) {
    return "audio/flac";
  }
  if (
    bytes[0] === 0xff ||
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)
  ) {
    return "audio/mpeg";
  }
  return "audio/wav";
}
