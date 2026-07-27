import { createWorker } from "tesseract.js";

/**
 * Extracts text from a chat/DM screenshot entirely on-device using
 * Tesseract.js (WebAssembly OCR) — genuinely free, no API key, no server
 * round-trip for the image itself. Supports English + Hindi so Hinglish
 * chat screenshots (a common Instagram/WhatsApp blackmail pattern) are
 * readable too.
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const worker = await createWorker(["eng", "hin"], undefined, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

/** Splits raw OCR'd chat text into individual message-ish lines for analysis. */
export function splitChatTextIntoLines(rawText: string): string[] {
  return rawText
    .split(/\n+/)
    .map((line) => line.trim())
    // OCR noise: drop empty lines, lone timestamps, and 1-2 char artifacts.
    .filter((line) => line.length > 2 && !/^\d{1,2}:\d{2}\s?(am|pm)?$/i.test(line));
}
