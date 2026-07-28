import type { CaseDetail, MapHotspot, ThreatLevel } from "@shared/types";
import type { LiveCaseState } from "@/context/liveCaseContextInstance";
import { resolveCaseDetailDurationMs } from "@/utils/caseDuration";

function severityForLevel(level: ThreatLevel): MapHotspot["severity"] {
  if (level === "critical" || level === "high") return "high";
  if (level === "elevated") return "medium";
  return "low";
}

/** Builds a CaseDetail snapshot from the current live dashboard state (for reports / register). */
export function buildCaseDetailFromLiveState(state: LiveCaseState): CaseDetail | null {
  if (!state.activeCase) return null;
  const lastPing = state.mapPings[state.mapPings.length - 1];

  const hotspot: MapHotspot = lastPing
    ? {
        id: lastPing.hotspotId,
        city: lastPing.city,
        state: lastPing.state,
        lat: lastPing.lat,
        lng: lastPing.lng,
        incidentCount: 1,
        severity: severityForLevel(state.threatLevel),
      }
    : {
        id: `hotspot-${state.activeCase.id}`,
        city: state.activeCase.city,
        state: state.activeCase.state,
        lat: 20.5937,
        lng: 78.9629,
        incidentCount: 1,
        severity: severityForLevel(state.threatLevel),
      };

  return {
    ...state.activeCase,
    status: "live",
    threatLevel: state.threatLevel,
    finalScore: state.threatScore,
    transcript: state.transcript,
    reasons: state.threatReasons,
    nodes: state.graph?.nodes ?? [],
    edges: state.graph?.edges ?? [],
    timeline: state.timeline,
    hotspot,
    durationMs: resolveCaseDetailDurationMs({
      durationMs: state.activeCase.durationMs,
      timeline: state.timeline,
    }),
  };
}
