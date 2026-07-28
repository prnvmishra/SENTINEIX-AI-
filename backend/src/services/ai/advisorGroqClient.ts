import { env } from "../../utils/env.js";

export interface AdvisorContextInput {
  threatScore: number;
  threatLevel: string;
  city?: string;
  state?: string;
  impersonatedAuthority?: string;
  decisionHeadline?: string;
  decisionActions?: string[];
  transcriptLines?: Array<{ speaker: string; text: string }>;
  entities?: string[];
  latestAiSummary?: string;
}

const REQUEST_TIMEOUT_MS = 20_000;

const GROQ_ADVISOR_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

export function isGroqAdvisorEnabled(): boolean {
  return Boolean(env.groqApiKey);
}

/**
 * When OpenRouter free quota is exhausted, Groq's separate free tier can still
 * power the investigation advisor chat (different daily limits).
 */
export async function askAdvisorViaGroq(
  systemPrompt: string,
  userContent: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): Promise<{ reply: string; model: string } | null> {
  if (!env.groqApiKey) return null;

  for (const model of GROQ_ADVISOR_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user" as const, content: userContent },
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.35,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn(`[advisor-groq] ${model} failed: ${response.status} ${body.slice(0, 120)}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      return { reply: content, model: `groq/${model}` };
    } catch (error) {
      console.warn(`[advisor-groq] ${model} error:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * Same Groq path used for live auto threat assessment when OpenRouter is
 * quota-exhausted / unavailable — keeps the gauge from freezing on rule-engine
 * alone mid-session.
 */
export async function analyzeTranscriptViaGroq(
  systemPrompt: string,
  userContent: string,
  options?: { maxTokens?: number; temperature?: number; json?: boolean },
): Promise<{ content: string; model: string } | null> {
  if (!env.groqApiKey) return null;

  for (const model of GROQ_ADVISOR_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens ?? 400,
          ...(options?.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.warn(`[threat-groq] ${model} failed: ${response.status} ${body.slice(0, 120)}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      return { content, model: `groq/${model}` };
    } catch (error) {
      console.warn(`[threat-groq] ${model} error:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

function usesHindi(message: string): boolean {
  return /[\u0900-\u097F]/.test(message) || /\b(kya|kaise|karun|karna|hai|nahi|paise|police|aage|filhaal|scam|report)\b/i.test(message);
}

function citizenStepsForLevel(context: AdvisorContextInput, hindi: boolean): string[] {
  const level = context.threatLevel ?? "low";
  const authority = context.impersonatedAuthority && context.impersonatedAuthority !== "Unknown (analyzing speech)"
    ? context.impersonatedAuthority
    : null;

  if (level === "critical" || level === "high") {
    if (hindi) {
      return [
        "Abhi call band karo — koi bhi paise, OTP, ya AnyDesk/TeamViewer install mat karo.",
        authority
          ? `Caller "${authority}" claim kar raha hai — asli police/CBI/RBI phone pe "digital arrest" ki dhamki NAHI deti.`
          : "Phone pe arrest/fine ki dhamki = classic Digital Arrest scam.",
        "Jo bhi recording / screenshot hai woh save karo → Cases mein Register as ONGOING karo (evidence ke saath).",
        "Report: cybercrime.gov.in ya National Helpline 1930 — complaint number note karo.",
        "Agar paise transfer ho chuke: turant bank fraud desk ko UTR/transaction ID do, account freeze karwao.",
        "Number block karo; number trace ke liye police ko lawful CDR chahiye — app khud phone trace nahi karti.",
      ];
    }
    return [
      "End the call now — do not transfer money, share OTP, or install remote-access apps.",
      authority
        ? `Caller claims "${authority}" — real Indian agencies do not threaten "digital arrest" over phone.`
        : "Arrest threats + urgent payment over phone = classic Digital Arrest scam pattern.",
      "Save recording/screenshot evidence → Register as ONGOING under Cases so it stays on record.",
      "File a report at cybercrime.gov.in or dial 1930 — keep the acknowledgment number.",
      "If money already moved: call your bank fraud desk immediately with UTR/transaction ID.",
      "Block the number; telecom trace requires a lawful police request, not something an app can do alone.",
    ];
  }

  if (level === "elevated") {
    if (hindi) {
      return [
        "Abhi koi payment mat karo — suspicious signs hain, lekin confirm karne ke liye evidence rakho.",
        "Caller ki identity Officer Registry / Verify se cross-check karo (app ke top nav mein).",
        "Agar pressure badhe ya paisa maange → turant call cut karke report karo.",
      ];
    }
    return [
      "Do not pay yet — suspicious signals present; preserve evidence while you verify.",
      "Cross-check claimed officer identity via Verify / Check in the app header.",
      "If pressure or payment demands increase → end call and report immediately.",
    ];
  }

  if (hindi) {
    return [
      "Abhi threat low hai — phir bhi koi OTP/paisa mat bhejo jab tak verify na ho.",
      "Suspicious lage toh evidence save karke Cases mein register kar sakte ho.",
    ];
  }
  return [
    "Threat is currently low — still never share OTP or send money without verification.",
    "If anything feels off, save evidence and register the case under Cases.",
  ];
}

function answerForQuestion(context: AdvisorContextInput, message: string, hindi: boolean): string | null {
  const lower = message.toLowerCase();

  if (/scam|fake|sach|real|legit|fraud|dhoka|jhooth|sach hai/i.test(lower)) {
    const score = context.threatScore ?? 0;
    if (hindi) {
      return score >= 50
        ? `Haan — is case mein score ${score}/100 (${(context.threatLevel ?? "").toUpperCase()}) hai. Transcript mein authority impersonation, pressure, ya payment demand ke signs mile. Real government process kabhi phone pe turant paisa/OTP nahi mangta.\n\n${citizenStepsForLevel(context, true).slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : `Abhi score ${score}/100 hai — clear scam confirm nahi, lekin savdhan raho. Koi payment/OTP tabhi mat do jab identity independently verify na ho.`;
    }
    return score >= 50
      ? `Yes — this case scores ${score}/100 (${(context.threatLevel ?? "").toUpperCase()}) with scam-pattern signals in the transcript. Legitimate government process never demands instant payment or OTP on a phone call.\n\n${citizenStepsForLevel(context, false).slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : `Current score is ${score}/100 — not a confirmed scam yet, but stay cautious and verify any claimed authority independently.`;
  }

  if (/police|report|1930|cybercrime|complaint|fir|authorit/i.test(lower)) {
    if (hindi) {
      return `Report karne ke steps:\n1. cybercrime.gov.in → "Report Cyber Crime" → incident details (caller number, UPI, screenshots) attach karo.\n2. Ya 1930 dial karo (National Cyber Crime Helpline).\n3. Is app se "Report to Authorities" panel se pre-filled summary copy kar sakte ho (Threat Intelligence mein HIGH pe dikhega).\n4. Case ko Cases mein ONGOING register karke evidence attach karo — investigation record ke liye.`;
    }
    return `To report:\n1. File at cybercrime.gov.in → "Report Cyber Crime" with caller number, UPI IDs, and screenshots.\n2. Or dial 1930 (National Cyber Crime Helpline).\n3. Use "Report to Authorities" in Threat Intelligence (appears at HIGH threat) for a pre-filled summary.\n4. Register the case as ONGOING under Cases with evidence attached.`;
  }

  if (/paise|money|transfer|upi|otp|refund|wapas|chale gaye|de diye|bhej di/i.test(lower)) {
    if (hindi) {
      return `Agar paise transfer ho chuke hain:\n1. Turant apni bank / UPI app ke fraud helpline pe call karo — UTR / transaction ID ready rakho.\n2. Account freeze / hold outbound transfers request karo.\n3. cybercrime.gov.in pe complaint + 1930 pe call — time matter karta hai (pehle 24 ghante critical).\n4. Is case ko evidence ke saath Register karo taaki officer baad mein Mark Complete kar sake.\n\nAage koi aur payment mat karo — scammer dubara contact kar sakta hai.`;
    }
    return `If money was already transferred:\n1. Call your bank / UPI fraud helpline immediately — have UTR / transaction ID ready.\n2. Request account freeze or hold on outbound transfers.\n3. File at cybercrime.gov.in and call 1930 — the first 24 hours are critical.\n4. Register this case with evidence so officers can track it.\n\nDo not send any further payments — scammers often call back.`;
  }

  return null;
}

/** Rich offline advisor when LLM APIs are unavailable — citizen-focused, not raw officer playbook. */
export function buildAdvisorFallback(context: AdvisorContextInput, message: string): string {
  const hindi = usesHindi(message);
  const level = (context.threatLevel || "unknown").toUpperCase();
  const score = context.threatScore ?? 0;
  const headline = context.decisionHeadline;

  const specific = answerForQuestion(context, message, hindi);
  if (specific) return specific;

  const steps = citizenStepsForLevel(context, hindi);
  const entityNote =
    context.entities && context.entities.length > 0
      ? hindi
        ? `\n\nIs call mein ye entities mile: ${context.entities.slice(0, 5).join(", ")} — inhe report mein zaroor likho.`
        : `\n\nEntities flagged in this call: ${context.entities.slice(0, 5).join(", ")} — include these in your report.`
      : "";

  const summaryNote = context.latestAiSummary
    ? hindi
      ? `\n\nAI assessment (pehle wala): ${context.latestAiSummary}`
      : `\n\nPrior AI assessment: ${context.latestAiSummary}`
    : "";

  if (hindi) {
    return (
      `Is case ka risk ${level} hai (${score}/100).` +
      (headline ? ` ${headline}.` : "") +
      `\n\nAb aage yeh karein:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` +
      entityNote +
      summaryNote +
      `\n\n(LLM quota abhi busy hai — yeh jawab live threat engine + case context se hai, phir bhi actionable hai.)`
    );
  }

  return (
    `This case is ${level} risk (${score}/100).` +
    (headline ? ` ${headline}.` : "") +
    `\n\nWhat to do next:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` +
    entityNote +
    summaryNote +
    `\n\n(LLM quota is busy — this answer uses live threat-engine context and is still actionable.)`
  );
}
