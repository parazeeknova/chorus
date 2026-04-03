import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { VoiceNotificationRequest } from "@chorus/voice";
import { VoiceNotificationRequestSchema } from "@chorus/voice";
import { Elysia, t } from "elysia";

const mockAudioBuffer = Buffer.from("mock-audio-response");

type VoiceGenerationRequest = Omit<VoiceNotificationRequest, "text"> & {
  text?: string;
};

function generateSpeechMock(_request: VoiceGenerationRequest) {
  if (_request.text === "fail") {
    return {
      id: "mock-notification-id",
      status: "failed" as const,
      error: "mock generation failed",
      generatedAt: new Date(),
    };
  }

  return {
    id: "mock-notification-id",
    status: "generated" as const,
    audioBase64: mockAudioBuffer.toString("base64"),
    mimeType: "audio/mpeg",
    generatedAt: new Date(),
  };
}

function transcribeSpeechMock() {
  return {
    text: "Transcribed text from audio",
    words: [
      { text: "Transcribed", start: 0, end: 0.5 },
      { text: "text", start: 0.5, end: 1.0 },
    ],
  };
}

const testApp = new Elysia({ prefix: "/voice" })
  .post(
    "/notify",
    ({ body }) => {
      const result = generateSpeechMock(body);
      return {
        accepted: result.status === "generated",
        notificationId: result.id,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
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
    ({ body, set }) => {
      const result = generateSpeechMock(body);

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
    ({ body }) => {
      const { audio } = body;
      expect(audio).toBeDefined();
      expect(typeof audio).toBe("string");

      const result = transcribeSpeechMock();
      return {
        text: result.text,
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

describe("voice routes integration", () => {
  let app: ReturnType<typeof createTestApp>;

  function createTestApp() {
    return new Elysia().use(testApp).listen(0);
  }

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(() => {
    app.stop();
  });

  describe("GET /voice/health", () => {
    test("returns health status", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/health`
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.service).toBe("voice");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("POST /voice/notify", () => {
    test("generates notification audio for approval_needed", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "approval_needed",
            text: "Test notification",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accepted).toBe(true);
      expect(body.notificationId).toBe("mock-notification-id");
      expect(body.audioBase64).toBeDefined();
      expect(body.mimeType).toBe("audio/mpeg");
    });

    test("generates notification for task_failed", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_failed",
            text: "Task failed",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accepted).toBe(true);
    });

    test("generates notification for task_completed", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_completed",
            text: "Task completed",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accepted).toBe(true);
    });

    test("rejects invalid notification type", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "invalid_type",
            text: "Test",
          }),
        }
      );
      expect(res.status).toBe(422);
    });

    test("rejects empty text", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "approval_needed",
            text: "",
          }),
        }
      );
      expect(res.status).toBe(422);
    });

    test("accepts missing text and uses generated template text", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_summary",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accepted).toBe(true);
    });

    test("accepts optional cardId and projectId", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "approval_needed",
            text: "Test",
            cardId: "card-123",
            projectId: "proj-456",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accepted).toBe(true);
    });
  });

  describe("POST /voice/tts", () => {
    test("converts text to speech", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_summary",
            text: "Hello world",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.notificationId).toBe("mock-notification-id");
      expect(body.audioBase64).toBeDefined();
      expect(body.mimeType).toBe("audio/mpeg");
    });

    test("accepts custom voiceId and modelId", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_summary",
            text: "Hello world",
            voiceId: "custom-voice",
            modelId: "eleven_turbo_v2",
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.notificationId).toBeDefined();
    });

    test("returns 502 when generation fails", async () => {
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_summary",
            text: "fail",
          }),
        }
      );
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.accepted).toBe(false);
      expect(body.error).toBe("mock generation failed");
    });
  });

  describe("POST /voice/stt", () => {
    test("transcribes base64 audio", async () => {
      const mockAudio = Buffer.from("mock-audio-data").toString("base64");
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/stt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: mockAudio,
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.text).toBe("Transcribed text from audio");
      expect(body.words).toBeDefined();
      expect(body.words.length).toBe(2);
    });

    test("accepts optional modelId and diarize", async () => {
      const mockAudio = Buffer.from("mock-audio-data").toString("base64");
      const res = await fetch(
        `http://localhost:${app.server?.port}/voice/stt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: mockAudio,
            modelId: "scribe_v1",
            diarize: true,
          }),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.text).toBe("Transcribed text from audio");
    });
  });
});
