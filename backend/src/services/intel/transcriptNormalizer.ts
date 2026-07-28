import { env } from "../../utils/env.js";
import { splitUnpunctuatedTurns } from "./conversationTurns.js";

/** Whisper often echoes instructional prompts verbatim into the transcript. */
const PROMPT_CONTAMINATION =
  /Keep Devanagari|Roman Hinglish as spoken|Transcribe EXACTLY|do not translate|account freeze may appear|Words like CBI,\s*ED,\s*RBI|Hinglish, or English/i;

/** Style-sample echoes from our short Roman Hinglish Whisper prompt. */
const STYLE_PROMPT_ECHO =
  /CBI se call aa rahi hai[\s.]+Account freeze ho sakta hai|OTP mat dena[\s.]+Sir please help me/i;

/** Devanagari, Arabic/Urdu, and related presentation forms — never wanted in our UI. */
const NON_LATIN_SCRIPT =
  /[\u0900-\u097F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const GROQ_ROMANIZE_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const ROMANIZE_TIMEOUT_MS = 60_000;

export function isPromptContamination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return PROMPT_CONTAMINATION.test(t) || STYLE_PROMPT_ECHO.test(t);
}

export function needsRomanization(text: string): boolean {
  return NON_LATIN_SCRIPT.test(text);
}

/**
 * Expand a blob of speech into utterance-sized lines so victim/scammer
 * diarization and threat analysis see the full call, not one giant block.
 */
export function splitIntoUtterances(text: string): string[] {
  const withPunct = text
    .split(
      /(?<=[.!?।…])\s+|\n+|(?<=\?\s)|(?<=[,;:])\s+(?=(?:main |haan |ji |please |sir |madam |otp |upi |cbi |hello |yes |no |yeah |kya |aap |tum |mera |meri |so |like |okay |ok ))/i,
    )
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && !isPromptContamination(chunk));

  // Unpunctuated call speech: further split on conversational turn cues
  return withPunct.flatMap((chunk) => {
    if (chunk.length < 100 || /[.!?]/.test(chunk)) return [chunk];
    return splitUnpunctuatedTurns(chunk);
  });
}

function mergeTinyFragments(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (out.length > 0 && (t.length < 8 || /^(haan|ji|ok|okay|yes|no|yeah|hmm+|acha|theek)\.?$/i.test(t))) {
      out[out.length - 1] = `${out[out.length - 1]} ${t}`.trim();
      continue;
    }
    out.push(t);
  }
  return out;
}

/**
 * Prefer Whisper's timed segments (each is usually one breath-group).
 * Only fall back to full-text split when segments are missing/sparse.
 */
export function buildTranscriptLines(segments: string[], fullText: string): string[] {
  const fromSegments = segments
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isPromptContamination(s));

  const cleanedFull = (fullText || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isPromptContamination(s))
    .join(" ")
    .trim();

  // Keep Whisper segment boundaries — expand only very long mashed segments
  const expandedSegments = fromSegments.flatMap((s) => {
    if (s.length > 140) return splitIntoUtterances(s);
    return [s];
  });

  const fromFull = cleanedFull.length > 0 ? splitIntoUtterances(cleanedFull) : [];

  let base: string[];
  if (expandedSegments.length >= 4) {
    // Trust Whisper timing: 19 segments must not collapse into 1–6 blobs
    base = expandedSegments;
    // If full text is much longer, append any missing tail via full-text split leftovers
    const segJoined = expandedSegments.join(" ").toLowerCase().replace(/\s+/g, " ");
    if (cleanedFull.length > segJoined.length * 1.25) {
      const extra = fromFull.filter((line) => {
        const key = line.toLowerCase().slice(0, 40);
        return key.length > 12 && !segJoined.includes(key);
      });
      if (extra.length > 0) base = [...expandedSegments, ...extra];
    }
  } else if (fromFull.length > expandedSegments.length) {
    base = fromFull;
  } else if (expandedSegments.length > 0) {
    base = expandedSegments;
  } else {
    base = fromFull;
  }

  return mergeTinyFragments(base).slice(0, 400);
}

async function romanizeBatchWithGroq(lines: string[]): Promise<string[] | null> {
  if (!env.groqApiKey) return null;

  const numbered = lines.map((text, i) => `${i + 1}. ${text}`).join("\n");
  const system = `You convert Indian phone-call transcripts to Latin script ONLY (English or Roman Hinglish).
Rules:
- If already Latin English/Hinglish → keep exactly
- If Urdu/Arabic script OR Devanagari → romanize to Hinglish sounds (میں → main, آپ → aap, ہے → hai)
- NEVER leave any Urdu, Arabic, or Devanagari characters in the output
- Do NOT invent new scam facts; do not summarize; keep the same words in order
- Keep CBI, ED, RBI, UPI, OTP, ITR, lakhs as-is
- Respond with STRICT JSON only: {"lines":["..."]} same length and order`;

  for (const model of GROQ_ROMANIZE_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ROMANIZE_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Convert these ${lines.length} lines:\n${numbered}` },
          ],
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn(`[transcript-normalize] ${model} failed: ${response.status} ${body.slice(0, 120)}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      const parsed = JSON.parse(content) as { lines?: unknown };
      if (!Array.isArray(parsed.lines) || parsed.lines.length !== lines.length) continue;

      return parsed.lines.map((item, i) => {
        const next = typeof item === "string" ? item.trim() : "";
        return next || lines[i];
      });
    } catch (error) {
      console.warn(
        `[transcript-normalize] ${model} error:`,
        error instanceof Error ? error.message : error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * Ensure every line is Latin-script English or Roman Hinglish (never Urdu/Devanagari).
 */
export async function ensureLatinHinglishLines(lines: string[]): Promise<string[]> {
  if (lines.length === 0) return lines;
  if (!lines.some(needsRomanization)) return lines;

  // Very long Urdu blobs: romanize in word packs so the model doesn't truncate.
  const packed: string[] = [];
  const packIndex: number[] = [];
  lines.forEach((line, lineIndex) => {
    if (!needsRomanization(line) || line.length < 500) {
      packed.push(line);
      packIndex.push(lineIndex);
      return;
    }
    const words = line.split(/\s+/);
    for (let i = 0; i < words.length; i += 80) {
      packed.push(words.slice(i, i + 80).join(" "));
      packIndex.push(lineIndex);
    }
  });

  const romanizedPacked = await romanizeBatchWithGroq(packed);
  if (!romanizedPacked) {
    console.warn("[transcript-normalize] romanization unavailable — stripping non-Latin script as last resort");
    return lines.map((t) =>
      needsRomanization(t) ? t.replace(NON_LATIN_SCRIPT, "").replace(/\s+/g, " ").trim() || "[non-Latin speech — romanization unavailable]" : t,
    );
  }

  // Reassemble packs back into original line slots
  const rebuilt: string[] = lines.map(() => "");
  romanizedPacked.forEach((piece, i) => {
    const idx = packIndex[i]!;
    rebuilt[idx] = rebuilt[idx] ? `${rebuilt[idx]} ${piece}`.trim() : piece;
  });

  const result = rebuilt.map((t, i) => t || lines[i]!);

  if (!result.some(needsRomanization)) {
    console.info(`[transcript-normalize] romanized ${lines.length} line(s) to Latin/Hinglish`);
    return result;
  }

  const offenders = result
    .map((text, index) => ({ text, index }))
    .filter((row) => needsRomanization(row.text));
  const retry = await romanizeBatchWithGroq(offenders.map((o) => o.text));
  if (!retry) {
    return result.map((t) =>
      needsRomanization(t) ? t.replace(NON_LATIN_SCRIPT, "").replace(/\s+/g, " ").trim() || t : t,
    );
  }

  const fixed = [...result];
  offenders.forEach((o, i) => {
    fixed[o.index] = retry[i] ?? fixed[o.index];
  });
  return fixed.map((t) =>
    needsRomanization(t) ? t.replace(NON_LATIN_SCRIPT, "").replace(/\s+/g, " ").trim() || t : t,
  );
}
