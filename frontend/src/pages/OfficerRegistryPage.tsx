import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Loader2,
  Phone,
  ShieldCheck,
  ShieldQuestion,
  UserPlus,
} from "lucide-react";
import type { EntityIntelResult, OfficerVerificationResult } from "@shared/types";
import { Button } from "@/components/Button";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/Badge";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/services/env";
import { fadeUp } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { intelApi } from "@/services/intelApi";
import { ApiClientError } from "@/services/apiClient";
import {
  listRegisteredOfficers,
  registerOfficer,
  verifyOfficer,
} from "@/services/officerRegistry";
import type { RegisteredOfficer } from "@/services/officerRegistry";

const riskTone: Record<string, "danger" | "warning" | "neutral" | "success"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
  CLEAN: "success",
  UNKNOWN: "neutral",
};

const inputClass =
  "rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary";

export function OfficerRegistryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"checkNumber" | "verify" | "register" | "directory">("checkNumber");

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4">
        <div className="flex items-center gap-4">
          <Logo showWordmark />
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden text-xs font-medium uppercase tracking-wider text-text-muted sm:inline">
            Verification Tools
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.dashboard)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Command Center
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-6">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <strong>What this really is:</strong> "Check a phone number" and "Verify a caller's name/badge" are two
            different real lookups. Phone checks hit real third-party APIs (CallTracer, FraudIntel India). The
            name/badge registry is a first-party directory that SentinelX owns — departments register their officers
            here. No public government database of officer identities exists for us (or anyone) to query, so that
            registry is only as complete as the departments who register into it. A "not found" result there means
            "not in our registry," not "not a real officer."
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "checkNumber" as const, label: "Check a phone number", icon: Phone },
                { id: "verify" as const, label: "Verify a caller's name/badge", icon: ShieldQuestion },
                { id: "register" as const, label: "Register an officer", icon: UserPlus },
                { id: "directory" as const, label: "Directory", icon: ShieldCheck },
              ]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  tab === item.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border-strong text-text-secondary hover:border-primary/40"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            ))}
          </div>

          {tab === "checkNumber" && <CheckNumberCard />}
          {tab === "verify" && <VerifyOfficerCard />}
          {tab === "register" && <RegisterOfficerCard registeredBy={user?.email ?? "unknown"} />}
          {tab === "directory" && <DirectoryCard />}
        </motion.div>
      </main>
    </div>
  );
}

function CheckNumberCard() {
  const { token } = useAuth();
  const [number, setNumber] = useState("");
  const [results, setResults] = useState<EntityIntelResult[] | null>(null);
  const [fraudIntelEnabled, setFraudIntelEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResults(null);
    if (!token) {
      setError("You must be signed in to run this check.");
      return;
    }
    setLoading(true);
    try {
      const response = await intelApi.checkPhone(token, number);
      setResults(response.results);
      setFraudIntelEnabled(response.fraudIntelEnabled);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Check failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel noPadding>
      <PanelHeader
        icon={Phone}
        title="Check a phone number before you trust the call"
        subtitle="Line-type + crowd-sourced spam-report lookup — no signup needed"
      />
      <div className="p-4">
        <p className="mb-3 text-[11px] leading-relaxed text-text-muted">
          Paste the number the caller used. This runs a real, on-demand lookup against{" "}
          <a href="https://calltracer.io" target="_blank" rel="noreferrer" className="text-primary hover:underline">
            CallTracer
          </a>{" "}
          (line type — mobile/landline/VOIP — plus a crowd-sourced spam score, always free, no key)
          {fraudIntelEnabled ? (
            <>
              {" "}
              and{" "}
              <a
                href="https://www.fraudintel.in"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                FraudIntel India
              </a>
              's crowd-sourced fraud database.
            </>
          ) : (
            "."
          )}{" "}
          This is a signal to weigh, not proof either way.
        </p>
        <p className="mb-3 rounded-md border border-border-strong bg-surface px-3 py-2 text-[11px] leading-relaxed text-text-muted">
          <strong className="text-text-secondary">Honest limits, so you know exactly what this does and doesn't do:</strong>{" "}
          Caller name and carrier fields only populate when that specific number already exists in these community
          databases — for most numbers today they'll come back empty, because these are small, still-growing
          datasets, not Truecaller's ~100M-user proprietary contact graph (which no free API can replicate). This is
          also not a call-tracing tool: a normal mobile/landline call never carries an IP address or live GPS
          location to your phone or to any app — that only exists inside the telecom's internal network as Call
          Detail Records (CDR), accessible only to the telecom and police/court via a lawful request. That's exactly
          why every case has a "Report to Authorities" action that deep-links to cybercrime.gov.in / dial 1930 — CDR
          pulls happen there, not in any consumer app.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Phone number
            <input
              required
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="e.g. 9876543210"
              className={inputClass}
            />
          </label>
          <Button type="submit" disabled={loading} size="md">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Check number
          </Button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="mt-4 rounded-md border border-border-strong px-3 py-2 text-xs text-text-muted">
            No lookup providers returned a result for this number.
          </div>
        )}

        {results && results.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {results.map((result) => (
              <div key={result.id} className="rounded-lg border border-border-strong p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-primary">{result.source}</span>
                  <Badge tone={riskTone[result.risk]}>{result.risk} risk</Badge>
                </div>
                <ul className="mt-2 flex flex-col gap-1">
                  {result.signals.map((signal) => (
                    <li key={signal} className="text-[11px] text-text-secondary">
                      • {signal}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-text-muted">{result.recommendation}</p>
              </div>
            ))}
            <p className="mt-1 text-[11px] text-text-muted">
              Genuine government officials never demand money over a call/video call, and never threaten a "digital
              arrest." If in doubt, hang up and call the department back using a number you look up independently —
              never one the caller gives you.
            </p>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function VerifyOfficerCard() {
  const [name, setName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [result, setResult] = useState<OfficerVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const outcome = await verifyOfficer(name, badgeNumber);
      setResult(outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel noPadding>
      <PanelHeader
        icon={ShieldQuestion}
        title="Verify a caller's claimed identity"
        subtitle="Check the name + badge number they gave you against our registry"
      />
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Name the caller gave you
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Aditya Verma"
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Badge / ID number they gave you
            <input
              required
              value={badgeNumber}
              onChange={(event) => setBadgeNumber(event.target.value)}
              placeholder="e.g. CBI-4471"
              className={inputClass}
            />
          </label>
          <Button type="submit" disabled={loading} size="md">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldQuestion className="h-4 w-4" />} Check
          </Button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-border-strong p-3">
            {result.status === "verified" && (
              <div className="flex items-start gap-2 text-success">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Matches a registered officer.</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {result.officer?.name} — {result.officer?.designation}, {result.officer?.department} (
                    {result.officer?.state})
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    This only confirms the name/badge match our registry — it does not prove the person calling you is
                    that officer. Never act on payment demands from an unsolicited call regardless of this result.
                  </p>
                </div>
              </div>
            )}
            {result.status === "mismatch" && (
              <div className="flex items-start gap-2 text-warning">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Badge number found, but the name doesn't match.</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Registry has this badge under a different name ({result.officer?.name}). Treat this call with
                    suspicion.
                  </p>
                </div>
              </div>
            )}
            {result.status === "not_found" && (
              <div className="flex items-start gap-2 text-danger">
                <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">No match in our registry.</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    This could mean the caller is not a real officer — or that their real department simply hasn't
                    registered here yet. Genuine government officials never demand money over a call or video call.
                    When in doubt, hang up and call the department back using a number you look up independently.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function RegisterOfficerCard({ registeredBy }: { registeredBy: string }) {
  const [name, setName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [state, setState] = useState("");
  const [designation, setDesignation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isFirebaseConfigured) {
      setError("Firebase isn't configured in this deployment, so the registry can't be written to.");
      return;
    }

    setSubmitting(true);
    try {
      await registerOfficer({ name, badgeNumber, department, state, designation, registeredBy });
      setSuccess(true);
      setName("");
      setBadgeNumber("");
      setDepartment("");
      setState("");
      setDesignation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassPanel noPadding>
      <PanelHeader
        icon={UserPlus}
        title="Register an officer"
        subtitle="For departments onboarding real officers into the registry"
      />
      <div className="p-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Full name
            <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Badge / ID number
            <input
              required
              value={badgeNumber}
              onChange={(event) => setBadgeNumber(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Designation
            <input
              required
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
              placeholder="e.g. Sub-Inspector"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Department
            <input
              required
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="e.g. Cyber Crime Cell"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary sm:col-span-2">
            State
            <input required value={state} onChange={(event) => setState(event.target.value)} className={inputClass} />
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger sm:col-span-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success sm:col-span-2">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" /> Officer registered. They're now checkable via "Verify a
              caller".
            </div>
          )}

          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Register officer
          </Button>
        </form>
      </div>
    </GlassPanel>
  );
}

function DirectoryCard() {
  const [officers, setOfficers] = useState<RegisteredOfficer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRegisteredOfficers()
      .then(setOfficers)
      .finally(() => setLoading(false));
  }, []);

  return (
    <GlassPanel noPadding>
      <PanelHeader icon={ShieldCheck} title="Registered officers" subtitle={`${officers.length} entries`} />
      <div className="max-h-96 overflow-y-auto p-2">
        {loading ? (
          <p className="p-3 text-xs text-text-muted">Loading…</p>
        ) : officers.length === 0 ? (
          <p className="p-3 text-xs text-text-muted">No officers registered yet.</p>
        ) : (
          officers.map((officer) => (
            <div key={officer.id} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-surface-raised/50">
              <div className="flex flex-col">
                <span className="text-sm text-text-primary">{officer.name}</span>
                <span className="text-[11px] text-text-muted">
                  {officer.designation}, {officer.department} — {officer.state}
                </span>
              </div>
              <Badge tone="primary">{officer.badgeNumber}</Badge>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
}
