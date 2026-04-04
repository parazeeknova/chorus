import { createLogger } from "@chorus/logger";
import type {
  SpeechToTextRequest,
  SpeechToTextResult,
  VoiceNotificationRequest,
  VoiceNotificationResult,
} from "@chorus/voice";
import Groq from "groq-sdk";
import { env } from "../../config/env";

const logger = createLogger(
  {
    env: process.env.NODE_ENV === "production" ? "production" : "development",
  },
  "VOICE"
);

export class VoiceService {
  private readonly client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: env.GROQ_API_KEY,
    });
  }

  async generateSpeech(
    request: VoiceNotificationRequest
  ): Promise<VoiceNotificationResult> {
    const voice = request.voiceId ?? env.GROQ_TTS_DEFAULT_VOICE;
    const modelId = request.modelId ?? env.GROQ_TTS_DEFAULT_MODEL_ID;

    const text = request.text;
    const truncatedText = text.length > 200 ? text.slice(0, 200) : text;

    if (text.length > 200) {
      logger.warn("tts-text-truncated", {
        originalLength: text.length,
        truncatedLength: truncatedText.length,
      });
    }

    logger.info("tts-start", {
      voice,
      modelId,
      textLength: truncatedText.length,
    });

    try {
      const response = await this.client.audio.speech.create({
        model: modelId,
        voice,
        input: truncatedText,
        response_format: "wav",
      });

      const audioBuffer = await response.arrayBuffer();

      logger.info("tts-success", {
        voice,
        modelId,
        bufferSize: audioBuffer.byteLength,
      });

      return {
        id: crypto.randomUUID(),
        status: "generated",
        audioBuffer,
        audioBase64: Buffer.from(audioBuffer).toString("base64"),
        mimeType: "audio/wav",
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error("tts-failed", error instanceof Error ? error : undefined, {
        voice,
        modelId,
      });
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        generatedAt: new Date(),
      };
    }
  }

  async streamSpeech(
    request: VoiceNotificationRequest
  ): Promise<ReadableStream<Uint8Array>> {
    const voice = request.voiceId ?? env.GROQ_TTS_DEFAULT_VOICE;
    const modelId = request.modelId ?? env.GROQ_TTS_DEFAULT_MODEL_ID;

    const text = request.text;
    const truncatedText = text.length > 200 ? text.slice(0, 200) : text;

    const response = await this.client.audio.speech.create({
      model: modelId,
      voice,
      input: truncatedText,
      response_format: "wav",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    });
  }

  async transcribeSpeech(
    request: SpeechToTextRequest
  ): Promise<SpeechToTextResult> {
    const modelId = request.modelId ?? env.GROQ_STT_MODEL_ID;

    const mimeType = request.mimeType ?? "audio/wav";
    const filename =
      request.filename ?? `audio.${this.extFromMimeType(mimeType)}`;

    logger.info("stt-start", {
      modelId,
      mimeType,
      filename,
      bufferSize: request.audioBuffer.byteLength,
    });

    try {
      const result = await this.client.audio.transcriptions.create({
        file: new File([request.audioBuffer], filename, {
          type: mimeType,
        }),
        model: modelId,
        response_format: "verbose_json",
        timestamp_granularities: ["word", "segment"],
      });

      const verboseResult = result as {
        text: string;
        words?: Array<{
          word: string;
          start: number;
          end: number;
        }>;
      };

      logger.info("stt-success", {
        modelId,
        textLength: result.text?.length ?? 0,
        wordCount: verboseResult.words?.length ?? 0,
      });

      return {
        text: result.text ?? "",
        confidence: undefined,
        words:
          verboseResult.words?.map(
            (w: { word: string; start: number; end: number }) => ({
              word: w.word ?? "",
              start: w.start ?? 0,
              end: w.end ?? 0,
              confidence: undefined,
            })
          ) ?? undefined,
      };
    } catch (error) {
      logger.error("stt-failed", error instanceof Error ? error : undefined, {
        modelId,
      });
      return {
        text: "",
        confidence: 0,
        words: [],
      };
    }
  }

  private extFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/flac": "flac",
      "audio/aac": "aac",
    };
    return map[mimeType] ?? "wav";
  }
}
