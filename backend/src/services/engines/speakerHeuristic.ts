import type { SpeakerType } from "@shared/types";
import { threatSignalDefinitions } from "../../data/threatSignals.js";

// Real conversational openers/acknowledgements a victim overwhelmingly says
// far more often than a scammer running a script ("hello", "yes", "who is
// this", pleading, short questions) — used as a real (if imperfect) content
// signal for the free-tier fallback path below.
const VICTIM_PATTERNS: RegExp[] = [
  /^\s*(hello|hi|hey|yes|yeah|yep|ok|okay|hmm|hmm+|haan|ji\b|namaste|acha|theek|sahi)\b/i,
  /\b(who is this|who are you|kaun bol rahe|kaun ho|kya hua|main kya karu|mujhe kya karna|what should i do|kya karna hoga)\b/i,
  /\b(i am scared|i'm scared|please help|please sir|please madam|bacha lo|dar lag raha|mujhe maaf|main innocent|i haven't done anything|maine kuch nahi kiya|maine kuch galat nahi|galatfahmi|samajh nahi aaya)\b/i,
  /\b(otp batau|otp de du|account number batau|paisa bheju|kya karna chahiye|aap kaun|kis department)\b/i,
  /\?\s*$/,
];

const scammerKeywordCategories = new Set(["authority_impersonation", "urgency_pressure", "money_transfer", "safe_account", "skype_verification", "isolation_request"]);
const victimSignal = threatSignalDefinitions.find((s) => s.category === "victim_distress");

function looksLikeScammerLine(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    /\b(cbi|ed\b|enforcement directorate|rbi|customs|cyber cell|digital arrest|account freeze|warrant|fir\b|kyc fail|safe account|customer care|otp (batao|do|share)|upi (bhejo|transfer)|court case|arrest warrant)\b/i.test(
      lower,
    )
  ) {
    return true;
  }
  return threatSignalDefinitions.some(
    (signal) => scammerKeywordCategories.has(signal.category) && signal.keywords.some((k) => lower.includes(k)),
  );
}

function looksLikeVictimLine(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (VICTIM_PATTERNS.some((re) => re.test(lower))) return true;
  return victimSignal ? victimSignal.keywords.some((k) => lower.includes(k)) : false;
}

/**
 * Best-effort speaker guess used ONLY as a fallback when the real AI
 * diarization call is unavailable (free OpenRouter daily quota exhausted,
 * network error, etc.) — a genuine content + turn-taking heuristic instead
 * of stamping one fixed label on an entire two-person recording, which would
 * mislabel roughly half of any real call/chat. Lines with a clear signal
 * either way are classified by content; everything else alternates turns
 * (a real conversation naturally goes back and forth), seeded off the
 * citizen's own manual pick for the very first ambiguous line.
 */
export function heuristicSpeakerGuess(lines: string[], defaultSpeaker: SpeakerType): SpeakerType[] {
  let lastSpeaker: SpeakerType = defaultSpeaker === "scammer" ? "victim" : "scammer";

  return lines.map((line) => {
    if (looksLikeScammerLine(line)) {
      lastSpeaker = "scammer";
      return "scammer";
    }
    if (looksLikeVictimLine(line)) {
      lastSpeaker = "victim";
      return "victim";
    }
    lastSpeaker = lastSpeaker === "scammer" ? "victim" : "scammer";
    return lastSpeaker;
  });
}
