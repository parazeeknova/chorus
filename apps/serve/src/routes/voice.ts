import {
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

const UNAVAILABLE = {
  error: "Voice service not configured. Set ELEVENLABS_API_KEY to enable.",
  timestamp: new Date().toISOString(),
} as const;

let voiceService: VoiceService | undefined;

function getVoiceService(): VoiceService | null {
  if (!voiceService) {
    if (!env.ELEVENLABS_API_KEY) {
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

      const audioBytes = Buffer.from(audio, "base64");
      const audioBuffer = audioBytes.buffer.slice(
        audioBytes.byteOffset,
        audioBytes.byteOffset + audioBytes.byteLength
      ) as ArrayBuffer;

      const detectedMimeType = mimeType ?? detectMimeType(audioBuffer);

      const svc = getVoiceService();
      if (!svc) {
        return UNAVAILABLE;
      }

      const result = await svc.transcribeSpeech({
        audioBuffer,
        modelId,
        diarize: diarize ?? false,
        mimeType: detectedMimeType,
        filename,
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
  .get("/health", () => ({
    status: env.ELEVENLABS_API_KEY ? "ok" : "unconfigured",
    service: "voice",
    timestamp: new Date().toISOString(),
  }));

function detectMimeType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) {
    return "audio/mpeg";
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
  return "audio/mpeg";
}
