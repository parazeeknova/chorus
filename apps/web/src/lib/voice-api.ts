import { blobToWav } from "@/lib/audio-wav-encoder";

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
  console.log("[voice-api] transcribeSpeech called", {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    options,
  });

  const wavBuffer = await blobToWav(audioBlob);
  const base64 = btoa(
    Array.from(new Uint8Array(wavBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join("")
  );

  console.log("[voice-api] sending request to", `${VOICE_API_BASE}/voice/stt`, {
    base64Length: base64.length,
    originalBlobType: audioBlob.type,
  });

  const response = await fetch(`${VOICE_API_BASE}/voice/stt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio: base64,
      modelId: options?.modelId,
      diarize: options?.diarize ?? false,
      mimeType: "audio/wav",
      filename: "recording.wav",
    }),
  });

  console.log("[voice-api] response status:", response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[voice-api] error response:", error);
    throw new Error(error.error ?? `Voice API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("[voice-api] response data:", data);

  return data;
}
