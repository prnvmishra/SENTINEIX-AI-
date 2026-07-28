import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

/** Short chunks reduce Whisper mid-call truncation / hallucination. */
const CHUNK_SECONDS = 40;
const OVERLAP_SECONDS = 2;
const SINGLE_PASS_MAX_SECONDS = 45;
const WAV_BYTES_PER_SEC = 32_000;
const FORCE_CHUNK_MIN_BYTES = 800 * 1024;

export interface AudioChunk {
  buffer: Buffer;
  mimeType: string;
  startSec: number;
  durationSec: number;
  index: number;
}

function runFfmpeg(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static binary missing"));
      return;
    }
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

async function runFfmpegOk(args: string[]): Promise<void> {
  const result = await runFfmpeg(args);
  if (result.code !== 0) {
    throw new Error(`ffmpeg exited ${result.code}: ${result.stderr.slice(-400)}`);
  }
}

function parseDurationSeconds(ffmpegStderr: string): number | null {
  const match = ffmpegStderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function extForMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

async function probeDuration(inputPath: string): Promise<number | null> {
  const { stderr } = await runFfmpeg(["-hide_banner", "-i", inputPath]);
  return parseDurationSeconds(stderr);
}

async function toMono16kWav(inputPath: string, outPath: string): Promise<void> {
  await runFfmpegOk([
    "-hide_banner",
    "-y",
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    outPath,
  ]);
}

/**
 * Always normalize to 16 kHz mono WAV (Whisper-friendly), then cut short
 * overlapping slices so multi-minute calls are fully transcribed.
 */
export async function prepareAudioChunks(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<{ chunks: AudioChunk[]; durationSec: number | null }> {
  const dir = await mkdtemp(path.join(tmpdir(), "sentinelx-audio-"));
  const inputExt = extForMime(mimeType);
  const inputPath = path.join(dir, `input.${inputExt}`);
  const fullWavPath = path.join(dir, "full.wav");

  try {
    await writeFile(inputPath, audioBuffer);

    let durationSec = await probeDuration(inputPath);

    // Normalize every upload to clean WAV before STT (better accuracy than raw webm/mp3).
    await toMono16kWav(inputPath, fullWavPath);
    const fullWav = await readFile(fullWavPath);
    if (durationSec == null) {
      durationSec = fullWav.length / WAV_BYTES_PER_SEC;
    }

    if (durationSec <= SINGLE_PASS_MAX_SECONDS && audioBuffer.length < FORCE_CHUNK_MIN_BYTES * 2) {
      return {
        chunks: [
          {
            buffer: fullWav,
            mimeType: "audio/wav",
            startSec: 0,
            durationSec,
            index: 0,
          },
        ],
        durationSec,
      };
    }

    const step = CHUNK_SECONDS - OVERLAP_SECONDS;
    const chunks: AudioChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < durationSec - 0.4) {
      const remaining = durationSec - start;
      const sliceDur = Math.min(CHUNK_SECONDS, remaining);
      const outPath = path.join(dir, `chunk-${index}.wav`);

      await runFfmpegOk([
        "-hide_banner",
        "-y",
        "-ss",
        start.toFixed(2),
        "-t",
        sliceDur.toFixed(2),
        "-i",
        fullWavPath,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        outPath,
      ]);

      chunks.push({
        buffer: await readFile(outPath),
        mimeType: "audio/wav",
        startSec: start,
        durationSec: sliceDur,
        index,
      });

      if (start + sliceDur >= durationSec - 0.2) break;
      start += step;
      index += 1;
      if (index > 60) break;
    }

    console.info(
      `[audio-chunk] duration=${durationSec.toFixed(1)}s → ${chunks.length} Whisper chunk(s)`,
    );
    return { chunks, durationSec };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const AUDIO_CHUNK_OVERLAP_SEC = OVERLAP_SECONDS;
