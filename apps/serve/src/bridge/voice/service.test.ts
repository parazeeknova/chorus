import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VoiceNotificationRequest } from "@chorus/voice";
import { VoiceService } from "./service";

const RUN_REAL_API =
  process.env.RUN_REAL_API_TESTS === "true" &&
  Boolean(process.env.ELEVENLABS_API_KEY);

const OUTPUT_DIR = join(process.cwd(), "tmp", "voice-test-outputs");
const INPUT_DIR = join(process.cwd(), "tmp", "voice-test-inputs");

const LONG_TIMEOUT = 60_000;
const ROUNDTRIP_TIMEOUT = 120_000;

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function saveFile(filePath: string, data: ArrayBuffer) {
  writeFileSync(filePath, Buffer.from(data));
  console.log(`  → Saved: ${filePath}`);
}

function saveTextFile(filePath: string, text: string) {
  writeFileSync(filePath, text, "utf-8");
  console.log(`  → Saved: ${filePath}`);
}

function assertGenerated(
  result: Awaited<ReturnType<VoiceService["generateSpeech"]>>
): ArrayBuffer {
  expect(result.status).toBe("generated");
  expect(result.audioBuffer).toBeDefined();
  expect(result.error).toBeUndefined();
  return result.audioBuffer as ArrayBuffer;
}

beforeAll(() => {
  ensureDir(OUTPUT_DIR);
  ensureDir(INPUT_DIR);
});

describe.skipIf(!RUN_REAL_API)("ElevenLabs Real API Tests", () => {
  describe("TTS — text to speech", () => {
    test(
      "reads input file and generates audio",
      async () => {
        const voiceService = new VoiceService();
        const inputPath = join(INPUT_DIR, "tts-input.txt");
        expect(existsSync(inputPath)).toBe(true);

        const text = readFileSync(inputPath, "utf-8").trim();
        console.log(`  → Input text: "${text.slice(0, 80)}..."`);

        const request: VoiceNotificationRequest = {
          type: "task_summary",
          text,
        };

        const result = await voiceService.generateSpeech(request);

        const audioBuffer = assertGenerated(result);
        expect(result.audioBase64).toBeDefined();
        expect(result.mimeType).toBe("audio/mpeg");

        const outputPath = join(OUTPUT_DIR, "tts-output.mp3");
        saveFile(outputPath, audioBuffer);

        const sizeKB = (audioBuffer.byteLength / 1024).toFixed(1);
        console.log(`  → Audio size: ${sizeKB} KB`);
      },
      { timeout: LONG_TIMEOUT }
    );

    test.skip(
      "generates audio with custom voice",
      async () => {
        const voiceService = new VoiceService();
        const request: VoiceNotificationRequest = {
          type: "task_summary",
          text: "This audio was generated with a different voice model.",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        };

        const result = await voiceService.generateSpeech(request);
        const audioBuffer = assertGenerated(result);

        const outputPath = join(OUTPUT_DIR, "tts-custom-voice.mp3");
        saveFile(outputPath, audioBuffer);
      },
      { timeout: LONG_TIMEOUT }
    );
  });

  describe("STT — speech to text", () => {
    test(
      "transcribes generated audio file",
      async () => {
        const voiceService = new VoiceService();
        const ttsInputPath = join(INPUT_DIR, "tts-input.txt");
        const originalText = readFileSync(ttsInputPath, "utf-8").trim();

        const ttsResult = await voiceService.generateSpeech({
          type: "task_summary",
          text: originalText,
        });

        const audioBuffer = assertGenerated(ttsResult);

        const sttResult = await voiceService.transcribeSpeech({
          audioBuffer,
        });

        expect(sttResult.text.length).toBeGreaterThan(0);
        console.log(`  → Original: "${originalText.slice(0, 80)}..."`);
        console.log(`  → Transcribed: "${sttResult.text.slice(0, 80)}..."`);

        const outputPath = join(OUTPUT_DIR, "stt-output.txt");
        saveTextFile(outputPath, sttResult.text);
      },
      { timeout: LONG_TIMEOUT }
    );

    test("transcribes audio file from inputs directory", async () => {
      const voiceService = new VoiceService();
      const audioFiles = ["stt-input.mp3", "stt-input.wav", "stt-input.ogg"];

      const existingAudio = audioFiles.find((f) =>
        existsSync(join(INPUT_DIR, f))
      );

      if (!existingAudio) {
        console.log(
          "  → No audio input file found. Place an audio file (stt-input.mp3, .wav, or .ogg) in tmp/voice-test-inputs/ to test STT."
        );
        return;
      }

      const audioPath = join(INPUT_DIR, existingAudio);
      const audioBuffer = readFileSync(audioPath).buffer;

      const result = await voiceService.transcribeSpeech({
        audioBuffer,
      });

      expect(result.text.length).toBeGreaterThan(0);
      console.log(
        `  → Transcribed from ${existingAudio}: "${result.text.slice(0, 100)}..."`
      );

      const outputPath = join(OUTPUT_DIR, `stt-from-${existingAudio}.txt`);
      saveTextFile(outputPath, result.text);
    });

    test(
      "transcribes with diarization",
      async () => {
        const voiceService = new VoiceService();
        const ttsResult = await voiceService.generateSpeech({
          type: "task_summary",
          text: "This is a test of the speech to text model with diarization enabled.",
        });

        const audioBuffer = assertGenerated(ttsResult);

        const sttResult = await voiceService.transcribeSpeech({
          audioBuffer,
          diarize: true,
        });

        console.log(
          `  → Transcribed with diarization: "${sttResult.text.slice(0, 80)}..."`
        );

        const outputPath = join(OUTPUT_DIR, "stt-diarization-output.txt");
        saveTextFile(outputPath, sttResult.text);
      },
      { timeout: LONG_TIMEOUT }
    );
  });

  describe("Round-trip — TTS then STT", () => {
    test(
      "text to speech back to text preserves content",
      async () => {
        const voiceService = new VoiceService();
        const testTexts = [
          "Hello world, this is a round-trip test.",
          "The quick brown fox jumps over the lazy dog.",
          "Chorus is an infinite canvas mission control system for AI coding agents.",
        ];

        for (const originalText of testTexts) {
          console.log(`  → Testing: "${originalText}"`);

          const ttsResult = await voiceService.generateSpeech({
            type: "task_summary",
            text: originalText,
          });

          const audioBuffer = assertGenerated(ttsResult);

          const sttResult = await voiceService.transcribeSpeech({
            audioBuffer,
          });

          expect(sttResult.text.length).toBeGreaterThan(0);

          const normalizedOriginal = originalText
            .toLowerCase()
            .replace(/[.,!?]/g, "")
            .trim();
          const normalizedTranscribed = sttResult.text
            .toLowerCase()
            .replace(/[.,!?]/g, "")
            .trim();

          const similarity = calculateSimilarity(
            normalizedOriginal,
            normalizedTranscribed
          );

          console.log(`  → Original:     "${normalizedOriginal}"`);
          console.log(`  → Transcribed:  "${normalizedTranscribed}"`);
          console.log(`  → Similarity:   ${(similarity * 100).toFixed(1)}%`);

          expect(similarity).toBeGreaterThan(0.5);

          const outputPath = join(
            OUTPUT_DIR,
            `roundtrip-${originalText.slice(0, 20).replace(/\s+/g, "-")}.txt`
          );
          saveTextFile(
            outputPath,
            `Original: ${originalText}\nTranscribed: ${sttResult.text}\nSimilarity: ${(similarity * 100).toFixed(1)}%\n`
          );
        }
      },
      { timeout: ROUNDTRIP_TIMEOUT }
    );
  });

  describe("Notification types — all event types", () => {
    const notifications: Array<{
      type: VoiceNotificationRequest["type"];
      text: string;
      file: string;
    }> = [
      {
        type: "approval_needed",
        text: "Task requires your approval. Please review and take action.",
        file: "notification-approval.mp3",
      },
      {
        type: "task_blocked",
        text: "Task has been blocked. Please check the details and decide next steps.",
        file: "notification-blocked.mp3",
      },
      {
        type: "task_failed",
        text: "A task has failed. Please review the error and determine how to proceed.",
        file: "notification-failed.mp3",
      },
      {
        type: "task_completed",
        text: "A task has completed successfully. All downstream dependencies are being processed.",
        file: "notification-completed.mp3",
      },
      {
        type: "policy_blocked",
        text: "A policy rule has blocked an action. Please review the policy decision.",
        file: "notification-policy-blocked.mp3",
      },
      {
        type: "task_summary",
        text: "Task summary: All three modules have been compiled and tests have passed. The build is ready for deployment.",
        file: "notification-summary.mp3",
      },
    ];

    for (const notification of notifications) {
      test(
        `generates ${notification.type} notification`,
        async () => {
          const voiceService = new VoiceService();
          const result = await voiceService.generateSpeech({
            type: notification.type,
            text: notification.text,
          });

          const audioBuffer = assertGenerated(result);

          const outputPath = join(OUTPUT_DIR, notification.file);
          saveFile(outputPath, audioBuffer);

          const sizeKB = (audioBuffer.byteLength / 1024).toFixed(1);
          console.log(`  → ${notification.file}: ${sizeKB} KB`);
        },
        { timeout: LONG_TIMEOUT }
      );
    }
  });

  describe("Streaming TTS", () => {
    test(
      "streams audio for longer text",
      async () => {
        const voiceService = new VoiceService();
        const stream = await voiceService.streamSpeech({
          type: "task_summary",
          text: "This is a streaming text-to-speech test. Streaming allows for lower latency playback as the audio is generated in chunks rather than waiting for the entire response.",
        });

        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            chunks.push(value);
          }
        }

        const totalLength = chunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        expect(totalLength).toBeGreaterThan(0);
        console.log(
          `  → Streamed audio: ${(totalLength / 1024).toFixed(1)} KB`
        );

        const outputPath = join(OUTPUT_DIR, "tts-streamed.mp3");
        saveFile(outputPath, result.buffer);
      },
      { timeout: LONG_TIMEOUT }
    );
  });
});

function calculateSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) {
    return 1;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
