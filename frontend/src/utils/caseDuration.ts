import type { CaseDetail, TimelineEvent } from "@shared/types";

/** Best available replay length — stored duration, timeline span, or media metadata. */
export function resolveCaseDurationMs(
  durationMs: number,
  timeline: TimelineEvent[] = [],
  mediaDurationMs = 0,
): number {
  const fromTimeline = timeline.reduce((max, event) => Math.max(max, event.timestampMs), 0);
  return Math.max(durationMs, fromTimeline, mediaDurationMs);
}

export function resolveCaseDetailDurationMs(
  caseDetail: Pick<CaseDetail, "durationMs" | "timeline">,
  mediaDurationMs = 0,
): number {
  return resolveCaseDurationMs(caseDetail.durationMs, caseDetail.timeline, mediaDurationMs);
}
