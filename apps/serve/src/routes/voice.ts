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

const voiceService = new VoiceService();

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

      const result = await voiceService.generateSpeech({
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
      body: VoiceNotificationRequestSchema,
    }
  )
  .post(
    "/tts",
    async ({ body }) => {
      const result = await voiceService.generateSpeech(body);

      if (result.status === "failed") {
        return {
          error: result.error,
          timestamp: new Date().toISOString(),
        };
      }

      return {
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
      const { audio, modelId, diarize } = body;

      const audioBuffer = Buffer.from(audio, "base64").buffer.slice(
        Buffer.from(audio, "base64").byteOffset,
        Buffer.from(audio, "base64").byteOffset +
          Buffer.from(audio, "base64").byteLength
      ) as ArrayBuffer;

      const result = await voiceService.transcribeSpeech({
        audioBuffer,
        modelId,
        diarize: diarize ?? false,
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
      }),
    }
  )
  .get("/health", () => ({
    status: "ok",
    service: "voice",
    timestamp: new Date().toISOString(),
  }));
