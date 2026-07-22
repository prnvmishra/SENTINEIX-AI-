import { v4 as uuid } from "uuid";
import type { ThreatLevel, ThreatReason, TranscriptLine } from "@shared/types";
import { escalationBonus, threatSignalDefinitions } from "../../data/threatSignals.js";

export interface ScoredTranscriptLine {
  line: TranscriptLine;
  newReasons: ThreatReason[];
  scoreAfter: number;
}

export interface ThreatEngineResult {
  scoredLines: ScoredTranscriptLine[];
  reasons: ThreatReason[];
  finalScore: number;
}

function matchKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  return keywords.find((keyword) => lower.includes(keyword)) ?? null;
}

export function scoreToLevel(score: number): ThreatLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "low";
}

export function runThreatEngine(transcript: TranscriptLine[]): ThreatEngineResult {
  const triggeredCategories = new Set<string>();
  const allReasons: ThreatReason[] = [];
  const scoredLines: ScoredTranscriptLine[] = [];

  let score = 0;
  let lastReasonTimestampMs: number | null = null;
  let escalationsApplied = 0;

  for (const line of transcript) {
    const newReasons: ThreatReason[] = [];

    for (const signal of threatSignalDefinitions) {
      if (triggeredCategories.has(signal.category)) continue;

      const matchedPhrase = matchKeyword(line.text, signal.keywords);
      if (!matchedPhrase) continue;

      triggeredCategories.add(signal.category);
      score += signal.weight;

      const isEscalation =
        lastReasonTimestampMs !== null &&
        line.timestampMs - lastReasonTimestampMs <= escalationBonus.windowMs &&
        escalationsApplied < escalationBonus.maxAppliedTimes;

      if (isEscalation) {
        score += escalationBonus.bonus;
        escalationsApplied += 1;
      }

      score = Math.min(100, score);
      lastReasonTimestampMs = line.timestampMs;

      const reason: ThreatReason = {
        id: uuid(),
        category: signal.category,
        label: signal.label,
        explanation: isEscalation
          ? `${signal.label} detected shortly after a prior signal, compounding the assessed risk.`
          : `${signal.label} detected in the conversation.`,
        matchedPhrase,
        delta: isEscalation ? signal.weight + escalationBonus.bonus : signal.weight,
        timestampMs: line.timestampMs,
        transcriptLineId: line.id,
      };

      newReasons.push(reason);
      allReasons.push(reason);
    }

    scoredLines.push({ line, newReasons, scoreAfter: score });
  }

  return { scoredLines, reasons: allReasons, finalScore: score };
}
