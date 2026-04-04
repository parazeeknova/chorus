import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { VoiceService } from "./service";

const INPUT_DIR = join(process.cwd(), "tmp", "voice-test-inputs");
const OUTPUT_DIR = join(process.cwd(), "tmp", "voice-manual-tests");

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i;

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function printHeader(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

function printResult(test: string, passed: boolean, detail?: string) {
  const status = passed ? "PASS" : "FAIL";
  const icon = passed ? "✓" : "✗";
  console.log(`  [${icon}] ${status}: ${test}`);
  if (detail) {
    console.log(`      ${detail}`);
  }
}

async function testTTS() {
  printHeader("TEST 1: Text-to-Speech (TTS)");

  const inputPath = join(INPUT_DIR, "tts-input.txt");

  if (!existsSync(inputPath)) {
    console.log("  No text input found.");
    console.log(`  → Create: ${inputPath}`);
    console.log(
      "  → Add your text (max 200 chars for Groq Orpheus) and run again.\n"
    );

    const defaultText =
      "Hello from Chorus, the AI agent orchestration platform.";
    console.log(`  Using default text: "${defaultText}"\n`);

    const service = new VoiceService();
    try {
      const result = await service.generateSpeech({
        type: "task_summary",
        text: defaultText,
      });

      if (result.status === "generated" && result.audioBuffer) {
        const sizeKB = (result.audioBuffer.byteLength / 1024).toFixed(1);
        printResult(
          "TTS generation (default text)",
          true,
          `Audio size: ${sizeKB} KB`
        );
        const outputPath = join(OUTPUT_DIR, "tts-test.wav");
        writeFileSync(outputPath, Buffer.from(result.audioBuffer));
        console.log(`  → Saved: ${outputPath}`);
      } else {
        printResult(
          "TTS generation (default text)",
          false,
          result.error || "No audio buffer"
        );
      }
    } catch (error) {
      printResult("TTS generation (default text)", false, String(error));
    }
    return;
  }

  const text = readFileSync(inputPath, "utf-8").trim();
  console.log(`  Input file: ${inputPath}`);
  console.log(
    `  Input text: "${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"\n`
  );

  const service = new VoiceService();
  try {
    const result = await service.generateSpeech({
      type: "task_summary",
      text,
    });

    if (result.status === "generated" && result.audioBuffer) {
      const sizeKB = (result.audioBuffer.byteLength / 1024).toFixed(1);
      printResult("TTS generation", true, `Audio size: ${sizeKB} KB`);
      const outputPath = join(OUTPUT_DIR, "tts-test.wav");
      writeFileSync(outputPath, Buffer.from(result.audioBuffer));
      console.log(`  → Saved: ${outputPath}`);
    } else {
      printResult("TTS generation", false, result.error || "No audio buffer");
    }
  } catch (error) {
    printResult("TTS generation", false, String(error));
  }
}

async function testSTT() {
  printHeader("TEST 2: Speech-to-Text (STT)");

  const audioFiles = getAudioInputFiles();

  if (audioFiles.length === 0) {
    console.log("  No audio input files found.");
    console.log(
      `  → Drop audio files (mp3, wav, ogg, flac, m4a) in: ${INPUT_DIR}`
    );
    console.log("  → Run again to test speech-to-text.\n");
    return;
  }

  const service = new VoiceService();

  for (const audioFile of audioFiles) {
    const audioPath = join(INPUT_DIR, audioFile);
    console.log(`  Processing: ${audioFile}`);

    try {
      const audioBuffer = readFileSync(audioPath).buffer;

      const sttResult = await service.transcribeSpeech({
        audioBuffer,
      });

      if (sttResult.text.length > 0) {
        printResult(
          `STT: ${audioFile}`,
          true,
          `Transcribed: "${sttResult.text.slice(0, 100)}..."`
        );
        const outputName = audioFile.replace(
          AUDIO_EXTENSIONS,
          "-transcript.txt"
        );
        const outputPath = join(OUTPUT_DIR, outputName);
        writeFileSync(outputPath, sttResult.text, "utf-8");
        console.log(`  → Saved: ${outputPath}`);
      } else {
        printResult(`STT: ${audioFile}`, false, "Empty transcription");
      }
    } catch (error) {
      printResult(`STT: ${audioFile}`, false, String(error));
    }
  }
}

async function testRoundTrip() {
  printHeader("TEST 3: Round-Trip (TTS → STT)");

  const inputPath = join(INPUT_DIR, "tts-input.txt");
  const originalText =
    inputPath && existsSync(inputPath)
      ? readFileSync(inputPath, "utf-8").trim()
      : "This is a test of the speech to text transcription.";

  console.log(
    `  Original text: "${originalText.slice(0, 100)}${originalText.length > 100 ? "..." : ""}"\n`
  );

  const service = new VoiceService();
  try {
    const ttsResult = await service.generateSpeech({
      type: "task_summary",
      text: originalText,
    });

    if (ttsResult.status !== "generated" || !ttsResult.audioBuffer) {
      printResult("Round-trip", false, "Failed to generate test audio");
      return;
    }

    console.log("  Transcribing generated audio...\n");

    const sttResult = await service.transcribeSpeech({
      audioBuffer: ttsResult.audioBuffer,
    });

    if (sttResult.text.length > 0) {
      printResult("Round-trip", true, `Transcribed: "${sttResult.text}"`);
      const outputPath = join(OUTPUT_DIR, "roundtrip-transcript.txt");
      writeFileSync(outputPath, sttResult.text, "utf-8");
      console.log(`  → Saved: ${outputPath}`);
    } else {
      printResult("Round-trip", false, "Empty transcription");
    }
  } catch (error) {
    printResult("Round-trip", false, String(error));
  }
}

function getAudioInputFiles(): string[] {
  if (!existsSync(INPUT_DIR)) {
    return [];
  }
  const files = readdirSync(INPUT_DIR);
  return files.filter((f) => AUDIO_EXTENSIONS.test(f));
}

async function main() {
  ensureDir(INPUT_DIR);
  ensureDir(OUTPUT_DIR);

  printHeader("GROQ VOICE MANUAL TEST SUITE");
  console.log(`  Input directory:  ${INPUT_DIR}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log("");
  console.log("  HOW TO USE:");
  console.log(
    "  1. Text input:  Create tmp/voice-test-inputs/tts-input.txt with your text"
  );
  console.log("                  (max 200 characters for Groq Orpheus TTS)");
  console.log(
    "  2. Audio input: Drop audio files (mp3, wav, ogg) in tmp/voice-test-inputs/"
  );
  console.log(
    "  3. Run:         bun run apps/serve/src/bridge/voice/service-manual-test.ts"
  );
  console.log(
    "  4. Check:       Open .wav files in tmp/voice-manual-tests/ to verify\n"
  );

  const start = Date.now();

  await testTTS();
  await testSTT();
  await testRoundTrip();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  printHeader(`TESTS COMPLETE (${elapsed}s)`);
  console.log(`  All outputs saved to: ${OUTPUT_DIR}`);
  console.log("  Open the .wav files to verify audio quality manually.\n");
}

main().catch(console.error);
