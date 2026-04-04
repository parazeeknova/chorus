import posthog from "posthog-js";

const VOICE_API_BASE =
  process.env.NEXT_PUBLIC_VOICE_API_URL ?? "http://localhost:2000";

export interface SpeechToTextResult {
  confidence?: number;
  text: string;
  timestamp: string;
  words?: Array<{
    confidence?: number;
    end: number;
    start: number;
    word: string;
  }>;
}

export interface GroqVoice {
  gender: string;
  id: string;
  name: string;
}

export interface VoiceConfigResponse {
  defaultModel: string;
  defaultVoice: string;
  timestamp: string;
  voices: GroqVoice[];
}

export async function fetchVoiceConfig(): Promise<VoiceConfigResponse> {
  const response = await fetch(`${VOICE_API_BASE}/voice/voices`);

  if (!response.ok) {
    throw new Error(`Failed to fetch voice config: ${response.status}`);
  }

  return response.json();
}

export async function transcribeSpeech(
  audioBlob: Blob,
  options?: {
    modelId?: string;
    diarize?: boolean;
  }
): Promise<SpeechToTextResult> {
  const startTime = Date.now();

  posthog.capture("voice_transcription_start", {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    modelId: options?.modelId,
    diarize: options?.diarize,
    timestamp: Date.now(),
  });

  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(
    Array.from(new Uint8Array(arrayBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join("")
  );

  posthog.capture("voice_transcription_request", {
    base64Length: base64.length,
    mimeType: audioBlob.type,
    timestamp: Date.now(),
  });

  const response = await fetch(`${VOICE_API_BASE}/voice/stt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio: base64,
      modelId: options?.modelId,
      diarize: options?.diarize ?? false,
      mimeType: audioBlob.type || "audio/webm",
      filename: "recording.webm",
    }),
  });

  posthog.capture("voice_transcription_response", {
    status: response.status,
    durationMs: Date.now() - startTime,
    timestamp: Date.now(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    posthog.capture("voice_transcription_error", {
      status: response.status,
      statusText: response.statusText,
      errorBody,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    });
    throw new Error(errorBody.error ?? `Voice API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.text || data.text.length === 0) {
    posthog.capture("voice_transcription_empty_result", {
      confidence: data.confidence,
      wordCount: data.words?.length ?? 0,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    });
    throw new Error(
      "Speech recognition returned empty text. Try speaking more clearly or check your microphone."
    );
  }

  posthog.capture("voice_transcription_success", {
    textLength: data.text.length,
    wordCount: data.words?.length ?? 0,
    confidence: data.confidence,
    durationMs: Date.now() - startTime,
    timestamp: Date.now(),
  });

  return data;
}
