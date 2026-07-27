import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  FileAudio,
  Fingerprint,
  ImageIcon,
  Loader2,
  Mic,
  MicOff,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useLiveCase } from "@/hooks/useLiveCase";
import { isLiveMicSession } from "@/context/liveCaseContextInstance";
import { useWebSpeechRecognition } from "@/hooks/useWebSpeechRecognition";
import type { RecognitionLanguage } from "@/hooks/useWebSpeechRecognition";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { getRealDeviceLocation } from "@/utils/geolocation";
import { analysisApi } from "@/services/analysisApi";
import type { RecordedCallAnalysisResponse, TextConversationAnalysisResponse } from "@/services/analysisApi";
import { ApiClientError } from "@/services/apiClient";
import { uploadCaseEvidenceImage, uploadCaseRecording } from "@/services/mediaStorage";
import { updateRegisteredCase } from "@/services/caseRegistry";
import { extractTextFromImage, splitChatTextIntoLines } from "@/services/ocrClient";
import { cn } from "@/utils/cn";

const riskTone: Record<string, "danger" | "warning" | "neutral" | "success"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
  CLEAN: "success",
  UNKNOWN: "neutral",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToBase64WithMime(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ base64: reader.result as string, mimeType: file.type || "audio/webm" });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LiveSessionControls() {
  const { token, user } = useAuth();
  const {
    isRunning,
    activeCase,
    entityIntel,
    deepfakeResults,
    startLiveSession,
    submitLiveLine,
    submitLiveLocation,
    submitLiveMediaCheck,
    endLiveSession,
    caseRegistrationEnabled,
    setCaseRegistrationEnabled,
    lastCompletedRegisteredCaseId,
  } = useLiveCase();

  const [language, setLanguage] = useState<RecognitionLanguage>("en-IN");
  const [speaker, setSpeaker] = useState<"scammer" | "victim">("scammer");
  const [locationStatus, setLocationStatus] = useState<"idle" | "pending" | "ok" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recordingSpeaker, setRecordingSpeaker] = useState<"scammer" | "victim">("scammer");
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingResult, setRecordingResult] = useState<RecordedCallAnalysisResponse | null>(null);
  const recordingInputRef = useRef<HTMLInputElement>(null);

  const [screenshotSpeaker, setScreenshotSpeaker] = useState<"scammer" | "victim">("scammer");
  const [screenshotStatus, setScreenshotStatus] = useState<"idle" | "reading" | "analyzing" | "done" | "error">("idle");
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshotResult, setScreenshotResult] = useState<TextConversationAnalysisResponse | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  async function handleScreenshotUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setScreenshotError("You must be signed in to analyze a screenshot.");
      setScreenshotStatus("error");
      return;
    }

    setScreenshotStatus("reading");
    setScreenshotError(null);
    setScreenshotResult(null);
    setOcrProgress(0);
    try {
      const rawText = await extractTextFromImage(file, setOcrProgress);
      const lines = splitChatTextIntoLines(rawText);
      if (lines.length === 0) {
        throw new Error("Couldn't read any text in this image — try a clearer, less-cropped screenshot.");
      }

      setScreenshotStatus("analyzing");
      const result = await analysisApi.analyzeText(token, {
        lines,
        victimAlias: user?.name ?? "Citizen (chat screenshot)",
        speaker: screenshotSpeaker,
      });
      setScreenshotResult(result);
      setScreenshotStatus("done");

      // Attach the original screenshot as evidence, same pattern as the
      // recorded-call audio upload — best-effort, never blocks the result.
      void uploadCaseEvidenceImage(result.caseId, file).then((url) => {
        if (url) updateRegisteredCase(result.caseId, { evidenceImageUrl: url });
      });
    } catch (err) {
      setScreenshotError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Screenshot analysis failed. Please try again.",
      );
      setScreenshotStatus("error");
    } finally {
      if (screenshotInputRef.current) screenshotInputRef.current.value = "";
    }
  }

  async function handleRecordingUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setRecordingError("You must be signed in to analyze a recording.");
      setRecordingStatus("error");
      return;
    }

    setRecordingStatus("analyzing");
    setRecordingError(null);
    setRecordingResult(null);
    try {
      const { base64, mimeType } = await fileToBase64WithMime(file);
      const result = await analysisApi.analyzeRecording(token, {
        audioBase64: base64,
        mimeType,
        victimAlias: user?.name ?? "Citizen (recorded call)",
        speaker: recordingSpeaker,
        language: language === "hi-IN" ? "hi" : "en",
      });
      setRecordingResult(result);
      setRecordingStatus("done");

      // By the time this HTTP response arrives, the server has already
      // broadcast case:start/case:end over the socket for this recording,
      // so LiveCaseContext has already registered it in the case registry.
      // Attach the real original audio file so it's replayable from
      // Historical Cases — best-effort, never blocks the analysis result.
      void uploadCaseRecording(result.caseId, file).then((url) => {
        if (url) updateRegisteredCase(result.caseId, { recordingUrl: url });
      });
    } catch (err) {
      setRecordingError(err instanceof ApiClientError ? err.message : "Analysis failed. Please try again.");
      setRecordingStatus("error");
    } finally {
      if (recordingInputRef.current) recordingInputRef.current.value = "";
    }
  }

  const handleFinalResult = useCallback(
    (text: string) => {
      if (text.trim()) submitLiveLine(text, speaker);
    },
    [submitLiveLine, speaker],
  );

  const speech = useWebSpeechRecognition({ onFinalResult: handleFinalResult });
  const audioRecorder = useAudioRecorder();

  const isLiveActive = isRunning && isLiveMicSession(activeCase);
  const scriptedSimRunning = isRunning && !isLiveMicSession(activeCase);

  async function handleStart() {
    startLiveSession();
    speech.start(language);
    void audioRecorder.start();

    setLocationStatus("pending");
    try {
      const { lat, lng } = await getRealDeviceLocation();
      setCoords({ lat, lng });
      submitLiveLocation(lat, lng);
      setLocationStatus("ok");
    } catch {
      setLocationStatus("denied");
    }
  }

  function handleStop() {
    const caseId = activeCase?.id;
    speech.stop();
    endLiveSession();
    setLocationStatus("idle");

    // Attach the real captured mic audio so this session is listen-back-able
    // from Historical Cases, not just its transcript. Best-effort — never
    // blocks ending the session.
    void audioRecorder.stop().then((blob) => {
      if (!blob || !caseId) return;
      void uploadCaseRecording(caseId, blob).then((url) => {
        if (url) updateRegisteredCase(caseId, { recordingUrl: url });
      });
    });
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !isLiveActive) return;

    setUploadStatus("uploading");
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type.startsWith("audio/") ? "audio" : "image";
      submitLiveMediaCheck(base64, mediaType, file.name);
    } finally {
      setUploadStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3.5">
      <div className="glass-panel rounded-lg border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <Fingerprint className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            Live Mic Session — Real Speech, Real Analysis
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-text-muted">
          Put a suspicious call on speakerphone near this device. Your browser's own speech recognition (100% free,
          no API key) transcribes it live, and the exact same threat engine used in the demo scenario analyzes the
          real words as they're spoken. Any phone number, UPI ID, or domain/link the caller <em>says out loud</em> is
          automatically checked against real intel sources (CallTracer for numbers, FraudIntel India when
          configured, IP/DNS geolocation for domains/links) — and you can scan a media file for deepfake signs via
          Reality Defender below.
        </p>
        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-text-muted">
          <strong className="text-text-secondary">Important — what "IP tracking" here can and can't do:</strong> a
          normal phone call (GSM/mobile network) never carries the caller's IP address to your phone — that's a
          telecom-network limitation, not a gap in this app, and no consumer app (Truecaller included) can bypass it.
          The IP/domain lookup above only fires on a website/link the scammer mentions (e.g. a fake "verification
          portal" they tell you to open) — it locates <em>that server</em>, not the phone line itself. Tracing the
          call's real origin requires the telecom's Call Detail Records, which only police can obtain via a lawful
          request — use "Report to Authorities" for that.
        </p>
      </div>

      {!isLiveActive && (
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border-strong bg-surface-raised/40 p-2.5 text-[11px] text-text-secondary">
          <input
            type="checkbox"
            checked={caseRegistrationEnabled}
            onChange={(e) => setCaseRegistrationEnabled(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-primary"
          />
          <span>
            <strong className="text-text-primary">Register this as a real case</strong> — saves it to the case
            database as <Badge tone="warning" className="mx-1 align-middle text-[9px]">ONGOING</Badge> the moment you
            start, automatically flips to <Badge tone="success" className="mx-1 align-middle text-[9px]">COMPLETED</Badge>{" "}
            when you stop, and counts toward the real numbers on the Analytics page and Historical Cases. Uncheck this
            only for a throwaway test run you don't want counted.
          </span>
        </label>
      )}

      {lastCompletedRegisteredCaseId && !isLiveActive && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-2.5 text-[11px] text-success">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Case <span className="font-mono">{lastCompletedRegisteredCaseId}</span>{" "}
          was marked COMPLETED and saved — check the Analytics page or Historical Cases to see it.
        </div>
      )}

      {!speech.isSupported && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-[11px] text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your browser doesn't support live speech recognition. Please switch to Chrome or Edge to use this feature.
        </div>
      )}

      {speech.error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-[11px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {speech.error}
        </div>
      )}

      {!isLiveActive ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">Recognition language:</span>
            <div className="flex gap-1">
              {(["en-IN", "hi-IN"] as RecognitionLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    language === lang
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  {lang === "en-IN" ? "English (India)" : "हिन्दी (Hindi)"}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={!speech.isSupported || scriptedSimRunning}
            onClick={handleStart}
            className="w-fit"
          >
            <Mic className="h-3.5 w-3.5" /> Start Live Mic Session
          </Button>
          {scriptedSimRunning && (
            <span className="text-[11px] text-text-muted">Stop the scripted simulation first to start a live session.</span>
          )}

          <div className="my-1 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wide text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="glass-panel rounded-lg border border-border p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <FileAudio className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-text-primary">Already recorded the call? Analyze it now</span>
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-text-muted">
              Upload the audio file — it's transcribed with a real speech-to-text model (Groq Whisper, free tier).
              Since a single audio file has no separate channel per person, the AI analyst then reads the full
              transcript and labels EACH line individually as caller or you, based on turn-taking and content (who's
              demanding money vs. who's afraid/complying) — not one label stamped on the whole call. The pick below is
              only a fallback if that AI step is unavailable.
            </p>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] text-text-muted">Fallback — if speaker detection is unavailable, assume:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setRecordingSpeaker("scammer")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    recordingSpeaker === "scammer"
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border-strong text-text-secondary hover:border-danger/40",
                  )}
                >
                  Caller
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingSpeaker("victim")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    recordingSpeaker === "victim"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  Me
                </button>
              </div>
            </div>
            <input
              ref={recordingInputRef}
              type="file"
              accept="audio/*"
              onChange={handleRecordingUpload}
              disabled={recordingStatus === "analyzing"}
              className="w-full text-[11px] text-text-muted"
            />

            {recordingStatus === "analyzing" && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Transcribing and analyzing — watch the panels above
                update live as it processes…
              </div>
            )}
            {recordingStatus === "error" && recordingError && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2 text-[11px] text-danger">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {recordingError}
              </div>
            )}
            {recordingStatus === "done" && recordingResult && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-2 text-[11px] text-success">
                <ShieldAlert className="h-3 w-3 shrink-0" /> Done — {recordingResult.lineCount} lines analyzed, final
                score {recordingResult.finalScore}/100 ({recordingResult.finalLevel.toUpperCase()}). Full breakdown is
                above.
              </div>
            )}
          </div>

          <div className="my-1 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wide text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="glass-panel rounded-lg border border-border p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-text-primary">
                Got a scam/blackmail chat screenshot? Analyze it
              </span>
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-text-muted">
              Instagram/WhatsApp sextortion and blackmail scams usually leave a chat trail instead of a call. Upload a
              screenshot — text is extracted entirely on this device (free, on-device OCR, no API key, image never
              leaves your browser). The AI analyst then reads every extracted message and labels EACH one
              individually as scammer or you, from context — not one label for the whole thread — before running the
              exact same threat/decision/AI engines.
            </p>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] text-text-muted">Fallback — if speaker detection is unavailable, assume:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setScreenshotSpeaker("scammer")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    screenshotSpeaker === "scammer"
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border-strong text-text-secondary hover:border-danger/40",
                  )}
                >
                  Scammer
                </button>
                <button
                  type="button"
                  onClick={() => setScreenshotSpeaker("victim")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    screenshotSpeaker === "victim"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  Me
                </button>
              </div>
            </div>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              disabled={screenshotStatus === "reading" || screenshotStatus === "analyzing"}
              className="w-full text-[11px] text-text-muted"
            />

            {screenshotStatus === "reading" && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Reading text from image on-device
                {ocrProgress > 0 ? ` — ${Math.round(ocrProgress * 100)}%` : "…"}
              </div>
            )}
            {screenshotStatus === "analyzing" && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Text extracted — analyzing for scam/blackmail
                indicators…
              </div>
            )}
            {screenshotStatus === "error" && screenshotError && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2 text-[11px] text-danger">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {screenshotError}
              </div>
            )}
            {screenshotStatus === "done" && screenshotResult && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-2 text-[11px] text-success">
                <ShieldAlert className="h-3 w-3 shrink-0" /> Done — {screenshotResult.lineCount} messages analyzed,
                final score {screenshotResult.finalScore}/100 ({screenshotResult.finalLevel.toUpperCase()}). Full
                breakdown is above.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="danger" dot>
              LIVE MIC ACTIVE
            </Badge>
            {locationStatus === "pending" && <Badge tone="neutral">Resolving real device location…</Badge>}
            {locationStatus === "ok" && <Badge tone="success">Real location captured</Badge>}
            {locationStatus === "denied" && <Badge tone="warning">Location permission denied</Badge>}
            {caseRegistrationEnabled && <Badge tone="warning">Saving as ONGOING case</Badge>}
            <Button variant="danger" size="sm" onClick={handleStop}>
              <MicOff className="h-3.5 w-3.5" /> Stop &amp; Mark Complete
            </Button>
          </div>

          {locationStatus === "ok" && coords && (
            <div className="rounded-md border border-border-strong bg-surface-raised/40 px-2.5 py-1.5 text-[11px] text-text-muted">
              Exact coordinates:{" "}
              <a
                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary hover:underline"
              >
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </a>{" "}
              (view on exact map pin). The map/city label elsewhere may look broader than expected — that's a real
              limitation of this device's location source, not a mock value. Laptops without a GPS chip resolve
              position via WiFi/IP, which is typically only city-accurate. Try this on a phone with location
              "precise" enabled for a tighter fix.
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">Who's speaking right now:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSpeaker("scammer")}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px]",
                  speaker === "scammer"
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-border-strong text-text-secondary hover:border-danger/40",
                )}
              >
                Caller
              </button>
              <button
                type="button"
                onClick={() => setSpeaker("victim")}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px]",
                  speaker === "victim"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border-strong text-text-secondary hover:border-primary/40",
                )}
              >
                Me
              </button>
            </div>
          </div>

          {speech.interimText && (
            <div className="rounded-md border border-border-strong bg-surface-raised/50 px-2.5 py-1.5 text-[11px] italic text-text-muted">
              "{speech.interimText}"
            </div>
          )}

          <div className="rounded-lg border border-border p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-text-primary">
              <Upload className="h-3 w-3" /> Deepfake / voice-clone check (Reality Defender)
            </div>
            <p className="mb-2 text-[10px] text-text-muted">
              Upload a short audio clip or a screenshot from the video call — it will be scanned for AI-generated
              signs. Heuristic only, best-effort.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,image/*"
              onChange={handleFileUpload}
              disabled={uploadStatus === "uploading"}
              className="w-full text-[11px] text-text-muted"
            />
          </div>

          {entityIntel.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Entity Intelligence — numbers, UPI IDs &amp; links mentioned
              </span>
              {entityIntel.map((result) => (
                <div key={result.id} className="flex flex-col gap-1 rounded-md border border-border-strong px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-text-primary">{result.entity}</span>
                    <Badge tone={riskTone[result.risk]}>{result.risk}</Badge>
                  </div>
                  <span className="text-[10px] text-text-muted">via {result.source}</span>
                </div>
              ))}
            </div>
          )}

          {deepfakeResults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                <ShieldAlert className="mr-1 inline h-3 w-3" /> Reality Defender — Media Scans
              </span>
              {deepfakeResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between gap-2 rounded-md border border-border-strong px-2.5 py-1.5">
                  <span className="text-[11px] text-text-primary">{result.mediaType === "audio" ? "Audio" : "Image"} sample</span>
                  <Badge tone={result.status === "FAKE" || result.status === "SUSPICIOUS" ? "danger" : "success"}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
