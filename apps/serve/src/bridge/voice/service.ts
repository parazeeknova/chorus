import type {
  SpeechToTextRequest,
  SpeechToTextResult,
  VoiceNotificationRequest,
  VoiceNotificationResult,
} from "@chorus/voice";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type {
  SpeechToTextConvertRequestModelId,
  TextToSpeechConvertRequestOutputFormat,
} from "@elevenlabs/elevenlabs-js/api";
import { env } from "../../config/env";

export class VoiceService {
  private readonly client: ElevenLabsClient;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: env.ELEVENLABS_API_KEY,
    });
  }

  async generateSpeech(
    request: VoiceNotificationRequest
  ): Promise<VoiceNotificationResult> {
    const voiceId = request.voiceId ?? env.ELEVENLABS_DEFAULT_VOICE_ID;
    const modelId = request.modelId ?? env.ELEVENLABS_DEFAULT_MODEL_ID;
    const outputFormat =
      env.ELEVENLABS_OUTPUT_FORMAT as TextToSpeechConvertRequestOutputFormat;

    try {
      const audio = await this.client.textToSpeech.convert(voiceId, {
        text: request.text,
        modelId,
        outputFormat,
      });

      const audioBuffer = await this.audioToBuffer(audio);

      return {
        id: crypto.randomUUID(),
        status: "generated",
        audioBuffer,
        audioBase64: Buffer.from(audioBuffer).toString("base64"),
        mimeType: this.getMimeType(outputFormat),
        generatedAt: new Date(),
      };
    } catch (error) {
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
    const voiceId = request.voiceId ?? env.ELEVENLABS_DEFAULT_VOICE_ID;
    const modelId = request.modelId ?? env.ELEVENLABS_DEFAULT_MODEL_ID;
    const outputFormat =
      env.ELEVENLABS_OUTPUT_FORMAT as TextToSpeechConvertRequestOutputFormat;

    const response = await this.client.textToSpeech.stream(voiceId, {
      text: request.text,
      modelId,
      outputFormat: outputFormat as never,
    });

    return response;
  }

  async transcribeSpeech(
    request: SpeechToTextRequest
  ): Promise<SpeechToTextResult> {
    const modelId = (request.modelId ??
      env.ELEVENLABS_STT_MODEL_ID) as SpeechToTextConvertRequestModelId;

    try {
      const result = await this.client.speechToText.convert({
        file: new File([request.audioBuffer], "audio.wav", {
          type: "audio/wav",
        }),
        modelId,
        diarize: request.diarize ?? false,
      });

      return {
        text: result.text ?? "",
        confidence: undefined,
        words:
          result.words?.map((w) => ({
            word: w.text ?? "",
            start: w.start ?? 0,
            end: w.end ?? 0,
            confidence: undefined,
          })) ?? undefined,
      };
    } catch (_error) {
      return {
        text: "",
        confidence: 0,
        words: [],
      };
    }
  }

  private async audioToBuffer(
    audio: ReadableStream<Uint8Array>
  ): Promise<ArrayBuffer> {
    const reader = audio.getReader();
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result.buffer;
  }

  private getMimeType(outputFormat: string): string {
    if (outputFormat.startsWith("mp3")) {
      return "audio/mpeg";
    }
    if (outputFormat.startsWith("pcm")) {
      return "audio/pcm";
    }
    if (outputFormat.startsWith("wav")) {
      return "audio/wav";
    }
    if (outputFormat.startsWith("ogg")) {
      return "audio/ogg";
    }
    if (outputFormat.startsWith("flac")) {
      return "audio/flac";
    }
    if (outputFormat.startsWith("aac")) {
      return "audio/aac";
    }
    return "audio/mpeg";
  }
}
