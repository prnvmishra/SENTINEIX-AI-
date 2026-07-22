import type { SpeakerType } from "./enums";

export interface TranscriptLine {
  id: string;
  caseId: string;
  sequence: number;
  speaker: SpeakerType;
  text: string;
  timestampMs: number;
  keywords: string[];
}
