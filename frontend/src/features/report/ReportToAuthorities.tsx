import { useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Phone } from "lucide-react";
import type { CaseSummary, EntityIntelResult, ThreatLevel, TranscriptLine } from "@shared/types";
import { Button } from "@/components/Button";

interface ReportToAuthoritiesProps {
  activeCase: CaseSummary | null;
  transcript: TranscriptLine[];
  entityIntel: EntityIntelResult[];
  threatLevel: ThreatLevel;
}

/**
 * There is no public API to file a complaint on a citizen's behalf with the
 * National Cyber Crime Reporting Portal or DoT's Chakshu system — those are
 * real government channels with no third-party write access. This component
 * is deliberately honest about that: it prefills a copyable incident summary
 * and deep-links to the real, official reporting channels instead of
 * pretending to submit anything itself.
 */
export function ReportToAuthorities({ activeCase, transcript, entityIntel, threatLevel }: ReportToAuthoritiesProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(threatLevel === "high" || threatLevel === "critical");

  const summaryText = useMemo(() => {
    if (!activeCase) return "";

    const entityLines = entityIntel.length
      ? entityIntel.map((e) => `- ${e.entityType.toUpperCase()} ${e.entity} (FraudIntel risk: ${e.risk})`).join("\n")
      : "- None flagged yet";

    const transcriptExcerpt = transcript
      .slice(-8)
      .map((line) => `[${line.speaker.toUpperCase()}] ${line.text}`)
      .join("\n");

    return [
      `INCIDENT SUMMARY — SentinelX AI`,
      `Date/Time: ${new Date().toLocaleString("en-IN")}`,
      `Location: ${activeCase.city}, ${activeCase.state}`,
      `Claimed authority: ${activeCase.impersonatedAuthority}`,
      `Threat assessment: ${activeCase.finalScore}/100 (${threatLevel.toUpperCase()})`,
      ``,
      `Flagged phone numbers / UPI IDs:`,
      entityLines,
      ``,
      `Call transcript excerpt (most recent):`,
      transcriptExcerpt || "(no transcript captured)",
    ].join("\n");
  }, [activeCase, transcript, entityIntel, threatLevel]);

  async function handleCopy() {
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!activeCase) return null;

  return (
    <div className="mx-3 mb-3 rounded-lg border border-danger/30 bg-danger/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <AlertTriangle className="h-3.5 w-3.5" /> Report to authorities
        </span>
        <span className="text-[10px] text-text-muted">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-danger/20 px-3 py-3">
          <p className="text-[11px] leading-relaxed text-text-secondary">
            There's no API that lets any app file this on your behalf — these are the real, official government
            channels. We prefill the incident details below so you can paste them straight in.
          </p>

          <div className="flex flex-col gap-2">
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-md border border-border-strong px-3 py-2 text-xs text-text-primary transition hover:border-primary/50"
            >
              File a complaint — National Cyber Crime Reporting Portal <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://sancharsaathi.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-md border border-border-strong px-3 py-2 text-xs text-text-primary transition hover:border-primary/50"
            >
              Report the number via Chakshu (Dept. of Telecom) <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="tel:1930"
              className="flex items-center justify-between rounded-md border border-border-strong px-3 py-2 text-xs text-text-primary transition hover:border-primary/50"
            >
              Call the Cyber Crime Helpline — 1930 <Phone className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-md border border-border-strong bg-surface-raised/50 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Copyable incident summary
              </span>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-6 px-2 text-[10px]">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-text-muted">
              {summaryText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
