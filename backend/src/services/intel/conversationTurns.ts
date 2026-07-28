import type { SpeakerType } from "@shared/types";
import { env } from "../../utils/env.js";

const TURN_SPLIT_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const TURN_SPLIT_TIMEOUT_MS = 60_000;

const PROMPT_JUNK =
  /Keep Devanagari|Transcribe EXACTLY|CBI se call aa rahi hai[\s.]+Account freeze|OTP mat dena[\s.]+Sir please help me/i;

function isJunk(text: string): boolean {
  const t = text.trim();
  return !t || PROMPT_JUNK.test(t);
}

export interface LabeledTurn {
  text: string;
  speaker: SpeakerType;
}

const TURN_SPLIT_SYSTEM = `You segment ONE mashed transcript line from an Indian scam call into short speaker turns.

Exactly two speakers:
- scammer: pitches fraud, demands money/OTP, claims authority, pressures urgency
- victim: asks questions, short replies, fear, anger, confirmation

Rules:
1. Produce MANY short turns (aim ~8–20 words each). Never return 1–2 giant paragraphs.
2. Split on every clear speaker change AND on natural phrase boundaries.
3. Do NOT invent or delete words — only cut existing text.
4. Latin script only (English / Roman Hinglish). No Urdu/Devanagari.
5. STRICT JSON only: {"turns":[{"speaker":"scammer"|"victim","text":"..."},...]}`;

/**
 * Heuristic split for unpunctuated Hinglish/English call speech when AI is down.
 * Looks for common turn-boundary phrases — never invents wording.
 */
export function splitUnpunctuatedTurns(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || isJunk(cleaned)) return [];

  const boundary =
    /\b(?=(?:so how much|how much do i|how much do you|what for how much|you have to pay|so you have to|yes and you|thank you so much|fuck off|okay fuck|fuck you|like yeah|so it means|so means|yeah international|right now you have|so that it doesn))/gi;

  const parts = cleaned
    .split(boundary)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !isJunk(p));

  if (parts.length <= 1) {
    // Fall back: pack ~18–28 words per turn so diarization has something to work with
    const words = cleaned.split(/\s+/);
    if (words.length <= 28) return [cleaned];
    const packed: string[] = [];
    for (let i = 0; i < words.length; i += 22) {
      packed.push(words.slice(i, i + 22).join(" "));
    }
    return packed;
  }

  return parts;
}

function parseTurnsJson(content: string): LabeledTurn[] | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as {
      turns?: Array<{ speaker?: string; text?: string }>;
    };
    if (!Array.isArray(parsed.turns) || parsed.turns.length === 0) return null;

    const turns: LabeledTurn[] = [];
    for (const row of parsed.turns) {
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (!text || isJunk(text)) continue;
      const speaker: SpeakerType =
        row.speaker === "scammer" || row.speaker === "victim" ? row.speaker : "unknown";
      turns.push({ text, speaker });
    }
    return turns.length > 0 ? turns : null;
  } catch {
    return null;
  }
}

/**
 * Real LLM turn-segmentation + victim/scammer labeling in one shot.
 * Returns null if models are unavailable (caller should use local split + separate diarization).
 */
export async function segmentAndLabelTurns(rawText: string): Promise<LabeledTurn[] | null> {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text || !env.groqApiKey) return null;

  const userContent = `Split and label this call transcript (do not invent words):\n\n${text}`;

  for (const model of TURN_SPLIT_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TURN_SPLIT_TIMEOUT_MS);
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
            { role: "system", content: TURN_SPLIT_SYSTEM },
            { role: "user", content: userContent },
          ],
          temperature: 0,
          max_tokens: 8000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn(`[turn-split] ${model} failed: ${response.status} ${body.slice(0, 140)}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      const turns = parseTurnsJson(content);
      if (!turns) continue;

      // Guard: reject if model dropped most of the transcript
      const inLen = text.replace(/\s+/g, "").length;
      const outLen = turns
        .map((t) => t.text)
        .join("")
        .replace(/\s+/g, "").length;
      if (outLen < inLen * 0.7) {
        console.warn(
          `[turn-split] ${model} dropped too much text (${outLen}/${inLen}) — trying next / falling back`,
        );
        continue;
      }

      console.info(`[turn-split] ${model} → ${turns.length} labeled turns`);
      // Reject under-split results (giant blobs) — caller will pack by words instead
      const avgWords =
        turns.reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0) / turns.length;
      if (turns.length < 2 || avgWords > 45) {
        console.warn(
          `[turn-split] ${model} under-split (turns=${turns.length}, avgWords=${avgWords.toFixed(1)}) — rejecting`,
        );
        continue;
      }
      return turns;
    } catch (error) {
      console.warn(`[turn-split] ${model} error:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * Real Groq LLM labels each transcript line as scammer/victim.
 * Prefer ONE full-call pass (conversation flow matters). Batch only if very long.
 */
export async function labelSpeakersViaGroq(lines: string[]): Promise<SpeakerType[] | null> {
  if (lines.length === 0 || !env.groqApiKey) return null;

  if (lines.length <= 40) {
    const labeled = await labelSpeakerBatchViaGroq(lines, []);
    if (labeled && labeled.length === lines.length) {
      console.info(`[speaker-groq] labeled ${labeled.length} lines (single pass)`);
      return labeled;
    }
    return null;
  }

  const BATCH = 20;
  const all: SpeakerType[] = [];
  for (let start = 0; start < lines.length; start += BATCH) {
    const batch = lines.slice(start, start + BATCH);
    const labeled = await labelSpeakerBatchViaGroq(batch, all.slice(-4));
    if (!labeled || labeled.length !== batch.length) {
      console.warn(
        `[speaker-groq] batch@${start} failed (got ${labeled?.length ?? 0}, need ${batch.length})`,
      );
      return null;
    }
    all.push(...labeled);
  }

  console.info(`[speaker-groq] labeled ${all.length} lines`);
  return all;
}

async function labelSpeakerBatchViaGroq(
  lines: string[],
  priorSpeakers: SpeakerType[],
): Promise<SpeakerType[] | null> {
  const numbered = lines.map((text, i) => `${i + 1}. ${text}`).join("\n");
  const prior =
    priorSpeakers.length > 0
      ? `Previous lines ended with speakers (in order): ${priorSpeakers.join(", ")}.\n`
      : "";

  const system = `You label lines from a 2-person Indian phone scam call.

SCAMMER (fraudster) typically:
- Pitches a scheme: "international payment", "ITR/tax clearance", "you will not give taxes", "account freeze", CBI/ED/RBI
- Commands the target: "you have to pay 50 lakhs", "OTP bhejo", "transfer now"
- Explains the scam deal as if helping: "pay 50, get 40 tax-free"

VICTIM (target) typically:
- Asks: "how much", "kitna", "kya", "kaise", "for how much"
- Thinks out loud about the demand: "so I have to pay 50 lakhs", "so I'll get only 40 lakhs"
- Confirms what they heard: "90 lakhs sir?", "international payment?"
- Refuses/ends: "fuck off", "thank you", "nahi", anger

CRITICAL — do NOT confuse these:
- "I have to pay / I'll get only / so means I'll get" → VICTIM (calculating the scam demand)
- "you have to pay / you will not give taxes / we will make it" → SCAMMER (pitching)
- Repeating a number the other person just said can be either; use who is commanding vs questioning.

Examples:
1. "you have to pay 50 lakhs sir" → scammer
2. "50 lakhs for how much?" → victim
3. "international payment of 90 lakhs" (as the pitch) → scammer
4. "so I have to pay 50 lakhs so I'll get only 40" → victim
5. "yes and you will not be giving any taxes" → scammer
6. "thank you fuck off" → victim

Return STRICT JSON only: {"speakers":["scammer"|"victim",...]} with EXACTLY ${lines.length} entries in order.`;

  for (const model of TURN_SPLIT_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TURN_SPLIT_TIMEOUT_MS);
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
            {
              role: "user",
              content: `${prior}Label these ${lines.length} lines (use full conversation flow):\n${numbered}`,
            },
          ],
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn(`[speaker-groq] ${model} failed: ${response.status} ${body.slice(0, 140)}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart < 0 || jsonEnd <= jsonStart) continue;
      const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as { speakers?: unknown };
      if (!Array.isArray(parsed.speakers) || parsed.speakers.length !== lines.length) {
        console.warn(
          `[speaker-groq] ${model} bad length: got ${Array.isArray(parsed.speakers) ? parsed.speakers.length : "n/a"}, need ${lines.length}`,
        );
        continue;
      }

      return parsed.speakers.map((value) =>
        value === "scammer" || value === "victim" ? (value as SpeakerType) : ("unknown" as const),
      );
    } catch (error) {
      console.warn(`[speaker-groq] ${model} error:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
