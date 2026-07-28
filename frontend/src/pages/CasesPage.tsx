import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileDown,
  FolderPlus,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { CaseDetail, CaseResolution, ThreatLevel } from "@shared/types";
import { Logo } from "@/components/Logo";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import { fadeUp, staggerContainer } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { useAuth } from "@/hooks/useAuth";
import { useCaseRegistry, computeCaseRegistryStats } from "@/hooks/useCaseRegistry";
import { deleteRegisteredCase, markCaseSolved, registerCase, reopenWronglyAutoCompletedCases } from "@/services/caseRegistry";
import { useGenerateReport } from "@/features/report/useGenerateReport";
import { canDeleteRegisteredCase, canMarkRegisteredCaseSolved } from "@/utils/caseAccess";
import { resolveCaseDetailDurationMs } from "@/utils/caseDuration";
import { CaseEvidencePanel } from "@/features/replay/CaseEvidencePanel";
import { formatTimestampMs } from "@/utils/formatTime";

const inputClass =
  "rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary";

const levelTone: Record<ThreatLevel, "success" | "warning" | "danger" | "neutral"> = {
  low: "success",
  elevated: "warning",
  high: "warning",
  critical: "danger",
};

const sourceLabel: Record<string, string> = {
  "live-mic": "Live mic",
  "recorded-upload": "Recorded call",
  "screenshot-upload": "Chat screenshot",
  manual: "Manual entry",
};

export function CasesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cases, isLoading, error } = useCaseRegistry();
  const stats = computeCaseRegistryStats(cases);
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const wronglyCompleted = cases.filter((c) => c.status === "resolved" && !c.resolution).length;
  // Count ongoing properly: live OR wrongly auto-completed without resolution
  const ongoingCount = cases.filter((c) => c.status === "live" || (c.status === "resolved" && !c.resolution)).length;
  const trulyCompleted = cases.filter((c) => c.status === "resolved" && c.resolution).length;

  async function handleFixAutoCompleted() {
    setFixing(true);
    setFixMessage(null);
    const result = await reopenWronglyAutoCompletedCases(cases);
    setFixing(false);
    if (result.error) {
      setFixMessage(`Fixed ${result.fixed}, but some failed: ${result.error}`);
    } else {
      setFixMessage(`Reopened ${result.fixed} case(s) back to ONGOING. Mark Complete only when you choose.`);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4">
        <div className="flex items-center gap-4">
          <Logo showWordmark />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-wider text-text-muted sm:inline">
            Case Registry
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Command Center
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={stats.total.toString()} icon={ClipboardList} />
            <StatCard label="Ongoing" value={ongoingCount.toString()} icon={FolderPlus} trendTone="danger" />
            <StatCard label="Completed" value={trulyCompleted.toString()} icon={CheckCircle2} trendTone="success" />
            <StatCard label="High / Critical" value={stats.highOrCritical.toString()} icon={ShieldCheck} trendTone="danger" />
          </motion.div>

          {wronglyCompleted > 0 && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <strong>{wronglyCompleted} case(s)</strong> were auto-marked COMPLETED by an older build (no officer
                clicked Mark Complete). Fix them back to ONGOING:
              </span>
              <Button size="sm" variant="outline" onClick={handleFixAutoCompleted} disabled={fixing}>
                {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}{" "}
                Reopen as ONGOING
              </Button>
            </motion.div>
          )}
          {fixMessage && (
            <motion.div variants={fadeUp} className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success">
              {fixMessage}
            </motion.div>
          )}

          {error && (
            <motion.div
              variants={fadeUp}
              className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Cannot load cases:</strong> {error}
              </span>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <ManualRegisterCard
              registeredByName={user?.name ?? "Unknown"}
              registeredByUid={user?.id ?? ""}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <GlassPanel noPadding glow>
              <PanelHeader
                icon={ClipboardList}
                title="All registered cases"
                subtitle="Stay ONGOING until you Mark Complete. Delete removes from database + Analytics. Download Report works for every real case."
              />
              <div className="p-3">
                {isLoading ? (
                  <LoadingState label="Loading cases..." />
                ) : cases.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No cases registered"
                    description="Use the form above for a manual case, or analyze a call/screenshot on the dashboard and click Yes — register as ONGOING."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {cases.map((c) => (
                      <CaseRow key={c.id} caseDetail={c} officerName={user?.name ?? "Officer"} />
                    ))}
                  </div>
                )}
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

function ManualRegisterCard({
  registeredByName,
  registeredByUid,
}: {
  registeredByName: string;
  registeredByUid: string;
}) {
  const [title, setTitle] = useState("");
  const [victimAlias, setVictimAlias] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [authority, setAuthority] = useState("");
  const [notes, setNotes] = useState("");
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("elevated");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessId(null);
    if (!registeredByUid) {
      setError("You must be signed in to register a case.");
      return;
    }
    setSubmitting(true);

    const id = `manual-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const scoreByLevel: Record<ThreatLevel, number> = { low: 15, elevated: 40, high: 65, critical: 90 };

    const detail: CaseDetail = {
      id,
      title: title.trim() || "Manual case registration",
      impersonatedAuthority: authority.trim() || "Unknown / not specified",
      status: "live",
      threatLevel,
      finalScore: scoreByLevel[threatLevel],
      city: city.trim() || "Unknown",
      state: state.trim() || "Unknown",
      startedAt: now,
      durationMs: 0,
      victimAlias: victimAlias.trim() || registeredByName,
      source: "manual",
      notes: notes.trim() || undefined,
      registeredByUid,
      registeredByName,
      transcript: [],
      reasons: [],
      nodes: [],
      edges: [],
      timeline: [
        {
          id: `tl-${id}`,
          caseId: id,
          type: "case_started",
          title: "Manual case registered",
          description: notes.trim() || "Case opened manually without live analysis.",
          timestampMs: 0,
        },
      ],
      hotspot: {
        id: `hotspot-${id}`,
        city: city.trim() || "Unknown",
        state: state.trim() || "Unknown",
        lat: 20.5937,
        lng: 78.9629,
        incidentCount: 1,
        severity: threatLevel === "critical" || threatLevel === "high" ? "high" : threatLevel === "elevated" ? "medium" : "low",
      },
    };

    const err = await registerCase(detail);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccessId(id);
    setTitle("");
    setVictimAlias("");
    setCity("");
    setState("");
    setAuthority("");
    setNotes("");
    setThreatLevel("elevated");
  }

  return (
    <GlassPanel noPadding>
      <PanelHeader
        icon={FolderPlus}
        title="Register a case manually"
        subtitle="No audio/screenshot required — write notes and open as ONGOING. Completes only when you mark it solved."
      />
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary sm:col-span-2">
          Case title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Digital arrest scam — Mumbai victim" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Victim name / alias
          <input value={victimAlias} onChange={(e) => setVictimAlias(e.target.value)} placeholder="Optional" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Impersonated authority
          <input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="e.g. CBI / RBI / Police" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          City
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          State
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Initial threat level
          <select value={threatLevel} onChange={(e) => setThreatLevel(e.target.value as ThreatLevel)} className={inputClass}>
            <option value="low">Low</option>
            <option value="elevated">Elevated</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary sm:col-span-2">
          Notes
          <textarea
            required
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened, phone numbers, UPI IDs, what the caller said…"
            className={`${inputClass} resize-y`}
          />
        </label>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger sm:col-span-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}
        {successId && (
          <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success sm:col-span-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Case <span className="font-mono">{successId}</span> registered as
            ONGOING — it now appears in Analytics.
          </div>
        )}

        <Button type="submit" disabled={submitting} className="sm:col-span-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />} Register as
          ONGOING
        </Button>
      </form>
    </GlassPanel>
  );
}

function CaseRow({ caseDetail, officerName }: { caseDetail: CaseDetail; officerName: string }) {
  const { user } = useAuth();
  const canMarkSolved = canMarkRegisteredCaseSolved(user, caseDetail);
  const canDelete = canDeleteRegisteredCase(user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSolve, setShowSolve] = useState(false);
  const [criminalName, setCriminalName] = useState("");
  const [notes, setNotes] = useState("");
  const { generateReport, isGenerating, error: reportError } = useGenerateReport();

  const isTrulyCompleted = caseDetail.status === "resolved" && Boolean(caseDetail.resolution);
  const isOngoing = !isTrulyCompleted;

  async function handleDelete() {
    if (!canDelete) return;
    if (!window.confirm("Delete this case from the database and Analytics?")) return;
    setBusy(true);
    setError(null);
    const err = await deleteRegisteredCase(caseDetail.id);
    setBusy(false);
    if (err) setError(err);
  }

  async function handleComplete(event: FormEvent) {
    event.preventDefault();
    if (!notes.trim()) {
      setError("Resolution notes are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const resolution: CaseResolution = {
      resolvedByName: officerName,
      criminalName: criminalName.trim() || undefined,
      notes: notes.trim(),
      resolvedAt: new Date().toISOString(),
    };
    const err = await markCaseSolved(caseDetail.id, resolution);
    setBusy(false);
    if (err) setError(err);
    else setShowSolve(false);
  }

  return (
    <div className="rounded-lg border border-border-strong bg-surface-raised/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-text-primary">{caseDetail.title}</p>
            <Badge tone={isOngoing ? "warning" : "success"} className="text-[10px]">
              {isOngoing ? "ONGOING" : "COMPLETED"}
            </Badge>
            <Badge tone={levelTone[caseDetail.threatLevel]} className="text-[10px]">
              {caseDetail.threatLevel} · {caseDetail.finalScore}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            {sourceLabel[caseDetail.source ?? "manual"]} · {caseDetail.city}, {caseDetail.state} ·{" "}
            {new Date(caseDetail.startedAt).toLocaleString("en-IN")}
            {resolveCaseDetailDurationMs(caseDetail) > 0
              ? ` · ${formatTimestampMs(resolveCaseDetailDurationMs(caseDetail))}`
              : ""}
          </p>
          {caseDetail.notes && <p className="mt-1 text-[11px] text-text-secondary">{caseDetail.notes}</p>}
          {caseDetail.resolution && (
            <p className="mt-1 text-[11px] text-success">
              Solved by {caseDetail.resolution.resolvedByName}: {caseDetail.resolution.notes}
            </p>
          )}
          {(caseDetail.recordingUrl || caseDetail.evidenceImageUrl) && (
            <div className="mt-2 max-w-lg">
              <CaseEvidencePanel
                recordingUrl={caseDetail.recordingUrl}
                evidenceImageUrl={caseDetail.evidenceImageUrl}
                source={caseDetail.source}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={isGenerating}
            onClick={() => generateReport(caseDetail.id, caseDetail)}
          >
            <FileDown className="h-3.5 w-3.5" /> {isGenerating ? "…" : "Report"}
          </Button>
          {isOngoing && canMarkSolved && (
            <Button size="sm" variant="outline" onClick={() => setShowSolve((v) => !v)} disabled={busy}>
              <ShieldCheck className="h-3.5 w-3.5" /> Mark Complete
            </Button>
          )}
          {isOngoing && !canMarkSolved && (
            <span className="self-center text-[10px] text-text-muted">Only the registrar can Mark Complete</span>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">{error}</div>
      )}
      {reportError && (
        <div className="mt-2 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
          {reportError}
        </div>
      )}

      {showSolve && canMarkSolved && (
        <form onSubmit={handleComplete} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <input
            value={criminalName}
            onChange={(e) => setCriminalName(e.target.value)}
            placeholder="Criminal / suspect name (optional)"
            className={inputClass}
          />
          <textarea
            required
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was this case solved?"
            className={`${inputClass} resize-y`}
          />
          <Button type="submit" size="sm" disabled={busy} className="self-start">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Confirm
            completed
          </Button>
        </form>
      )}
    </div>
  );
}
