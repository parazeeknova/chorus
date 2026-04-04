const VOICE_API_BASE =
  process.env.NEXT_PUBLIC_VOICE_API_URL ?? "http://localhost:3001";

export interface SpeechToTextResult {
  confidence?: number;
  text: string;
  timestamp: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
}

export async function transcribeSpeech(
  audioBlob: Blob,
  options?: {
    modelId?: string;
    diarize?: boolean;
  }
): Promise<SpeechToTextResult> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(
    Array.from(new Uint8Array(arrayBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join("")
  );

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? `Voice API error: ${response.status}`);
  }

  return response.json();
}
