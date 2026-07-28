import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/services/firebaseClient";

const UPLOAD_TIMEOUT_MS = 20_000;
/** Keep inline fallback within Firebase RTDB write limits (~10MB hard max). */
const INLINE_MAX_EDGE = 1280;
const INLINE_JPEG_QUALITY = 0.72;
/** ~3.5MB raw → ~4.7MB base64 — still under RTDB's 10MB write cap for hackathon demos. */
const INLINE_AUDIO_MAX_BYTES = 3_500_000;

/**
 * Uploads real evidence (call recording / chat screenshot) to Firebase Storage
 * so Historical Cases can play it back. Returns null if Storage isn't
 * configured or the upload is denied by rules — callers must surface that.
 */
async function uploadCaseMedia(path: string, blob: Blob, contentType: string): Promise<string | null> {
  if (!storage) {
    console.warn("[media-storage] Firebase Storage is not configured.");
    return null;
  }
  try {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType });
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.warn(`[media-storage] upload failed for ${path}:`, error);
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function extensionForAudio(blob: Blob, fileName?: string): string {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && ["mp3", "wav", "ogg", "m4a", "aac", "webm", "mp4"].includes(fromName)) return fromName;
  if (blob.type.includes("mpeg") || blob.type.includes("mp3")) return "mp3";
  if (blob.type.includes("wav")) return "wav";
  if (blob.type.includes("ogg")) return "ogg";
  if (blob.type.includes("mp4") || blob.type.includes("m4a")) return "m4a";
  return "webm";
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export type EvidenceUploadResult = {
  url: string;
  /** firebase = Storage download URL; inline = data-URL stored in RTDB */
  source: "firebase" | "inline";
};

/**
 * Always returns a playable URL when possible:
 * 1) Firebase Storage (preferred, 20s timeout)
 * 2) Inline data-URL for files ≤ ~3.5MB (survives register without Storage)
 */
export async function uploadCaseRecording(
  caseId: string,
  blob: Blob,
  fileName?: string,
): Promise<EvidenceUploadResult | null> {
  const extension = extensionForAudio(blob, fileName);
  // Strip codecs=… — Storage metadata rejects some full mime strings.
  const rawType = (blob.type || (extension === "mp3" ? "audio/mpeg" : `audio/${extension}`)).split(";")[0];
  const contentType = rawType || `audio/${extension}`;

  try {
    const url = await withTimeout(
      uploadCaseMedia(`recordings/${caseId}.${extension}`, blob, contentType),
      UPLOAD_TIMEOUT_MS,
      "audio upload",
    );
    if (url) return { url, source: "firebase" };
  } catch (error) {
    console.warn("[media-storage] audio Storage upload failed/timed out — trying inline fallback:", error);
  }

  if (blob.size <= INLINE_AUDIO_MAX_BYTES) {
    try {
      const dataUrl = await blobToDataUrl(blob);
      console.info(`[media-storage] using inline audio fallback (${blob.size} bytes) for ${caseId}`);
      return { url: dataUrl, source: "inline" };
    } catch (error) {
      console.warn("[media-storage] inline audio fallback failed:", error);
    }
  } else {
    console.warn(
      `[media-storage] audio too large for inline fallback (${blob.size} bytes). Publish Storage rules for recordings/.`,
    );
  }

  return null;
}

/**
 * Compresses a screenshot to a JPEG data-URL so evidence still attaches when
 * Firebase Storage hangs or rules block uploads (common in hackathon setups).
 */
export function compressImageToDataUrl(
  blob: Blob,
  maxEdge = INLINE_MAX_EDGE,
  quality = INLINE_JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable for image compression"));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode screenshot for inline evidence"));
    };
    image.src = objectUrl;
  });
}

/**
 * Tries Firebase Storage (20s max). On hang/deny/missing config, falls back to
 * a compressed JPEG data-URL so register is never blocked for minutes.
 */
export async function uploadCaseEvidenceImage(caseId: string, blob: Blob): Promise<EvidenceUploadResult | null> {
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const contentType = blob.type || `image/${extension === "jpg" ? "jpeg" : extension}`;

  try {
    const url = await withTimeout(
      uploadCaseMedia(`evidence/${caseId}.${extension}`, blob, contentType),
      UPLOAD_TIMEOUT_MS,
      "screenshot upload",
    );
    if (url) return { url, source: "firebase" };
  } catch (error) {
    console.warn("[media-storage] screenshot Storage upload failed/timed out — using inline fallback:", error);
  }

  try {
    const dataUrl = await compressImageToDataUrl(blob);
    return { url: dataUrl, source: "inline" };
  } catch (error) {
    console.warn("[media-storage] inline screenshot fallback failed:", error);
    return null;
  }
}

/** Reads real media duration from an audio/video blob (ms). Returns 0 if unreadable. */
export function getAudioDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const isVideo =
      blob.type.startsWith("video/") ||
      /\.(mp4|mov|webm|mkv)$/i.test(blob.type) ||
      (blob.type === "" && blob.size > 0);
    const media = document.createElement(isVideo ? "video" : "audio");
    media.preload = "metadata";
    media.muted = true;

    let settled = false;
    const finish = (ms: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      media.removeAttribute("src");
      media.load();
      resolve(ms);
    };

    const readDuration = () => {
      const seconds = media.duration;
      if (Number.isFinite(seconds) && seconds > 0) {
        finish(Math.round(seconds * 1000));
      }
    };

    const timeout = window.setTimeout(() => finish(0), 8_000);

    media.onloadedmetadata = readDuration;
    media.ondurationchange = readDuration;
    media.oncanplay = readDuration;
    media.onerror = () => finish(0);
    media.src = url;
    media.load();
  });
}
