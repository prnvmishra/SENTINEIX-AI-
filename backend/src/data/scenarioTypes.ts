import type { SpeakerType } from "@shared/types";

export interface ScenarioLine {
  speaker: SpeakerType;
  text: string;
  offsetMs: number;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  impersonatedAuthority: string;
  victimAlias: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  scammerPhone: string;
  muleAccount: string;
  campaignId: string;
  campaignLabel: string;
  startedAt: string;
  lines: ScenarioLine[];
}
