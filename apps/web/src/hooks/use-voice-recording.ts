import { useCallback, useRef, useState } from "react";
import { transcribeSpeech } from "@/lib/voice-api";

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 2000;
const SILENCE_CHECK_INTERVAL_MS = 100;

interface UseVoiceRecordingReturn {
  error: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export function useVoiceRecording(
  onTranscriptionComplete: (text: string) => void,
  options?: {
    modelId?: string;
  }
): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  const stopRecordingRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const detectSilence = useCallback(() => {
    if (!analyserRef.current) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (const value of dataArray) {
      const amplitude = (value - 128) / 128;
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    if (rms < SILENCE_THRESHOLD) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION_MS) {
        stopRecordingRef.current();
      }
    } else {
      silenceStartRef.current = null;
    }
  }, []);

  const startSilenceDetection = useCallback(() => {
    silenceStartRef.current = null;
    silenceTimerRef.current = setInterval(
      detectSilence,
      SILENCE_CHECK_INTERVAL_MS
    );
  }, [detectSilence]);

  const stopSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    silenceStartRef.current = null;
  }, []);

  const handleTranscription = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        setError("Recording was empty");
        return;
      }

      try {
        setIsTranscribing(true);
        const result = await transcribeSpeech(blob, {
          modelId: options?.modelId,
        });
        onTranscriptionComplete(result.text);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to transcribe audio";
        setError(message);
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscriptionComplete, options?.modelId]
  );

  const cleanupAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const handleRecordingStop = useCallback(
    async (mediaRecorder: MediaRecorder) => {
      setIsRecording(false);
      stopSilenceDetection();
      cleanupAudioContext();
      cleanupStream();

      const blob = new Blob(chunksRef.current, {
        type: mediaRecorder.mimeType,
      });
      chunksRef.current = [];

      await handleTranscription(blob);
    },
    [
      cleanupAudioContext,
      cleanupStream,
      handleTranscription,
      stopSilenceDetection,
    ]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;

      startSilenceDetection();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access microphone";
      setError(message);
    }
  }, [startSilenceDetection]);

  const stopRecording = useCallback((): Promise<void> => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      return Promise.resolve();
    }

    isRecordingRef.current = false;

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        resolve();
        return;
      }

      mediaRecorder.onstop = async () => {
        await handleRecordingStop(mediaRecorder);
        resolve();
      };

      mediaRecorder.stop();
    });
  }, [handleRecordingStop]);

  stopRecordingRef.current = stopRecording;

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
  };
}
