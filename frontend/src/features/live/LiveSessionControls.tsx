import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  Fingerprint,
  FolderPlus,
  ImageIcon,
  Loader2,
  Mic,
  MicOff,
  ShieldAlert,
  Trash2,
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
import { uploadCaseEvidenceImage, uploadCaseRecording, getAudioDurationMs, blobToDataUrl } from "@/services/mediaStorage";
import { extractTextFromImage, splitChatTextIntoLines } from "@/services/ocrClient";
import { AudioPlayer } from "@/features/replay/AudioPlayer";
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
    pendingRegistration,
    attachPendingEvidence,
    registerPendingCase,
    discardPendingRegistration,
    lastRegisteredCaseId,
    caseRegistryError,
  } = useLiveCase();

  const [registering, setRegistering] = useState(false);

  const [language, setLanguage] = useState<RecognitionLanguage>("en-IN");
  const [speaker, setSpeaker] = useState<"scammer" | "victim">("scammer");
  const [locationStatus, setLocationStatus] = useState<"idle" | "pending" | "ok" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recordingLanguage, setRecordingLanguage] = useState<"auto" | "hi" | "en">("auto");
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingResult, setRecordingResult] = useState<RecordedCallAnalysisResponse | null>(null);
  const recordingInputRef = useRef<HTMLInputElement>(null);

  const [screenshotStatus, setScreenshotStatus] = useState<
    "idle" | "reading" | "analyzing" | "uploading" | "done" | "error"
  >("idle");
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshotResult, setScreenshotResult] = useState<TextConversationAnalysisResponse | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [voiceUploadStatus, setVoiceUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [localRecordingPreviewUrl, setLocalRecordingPreviewUrl] = useState<string | null>(null);
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
    setScreenshotPreviewUrl(null);
    setOcrProgress(0);
    try {
      const previewUrl = await fileToBase64(file);
      setScreenshotPreviewUrl(previewUrl);

      const rawText = await extractTextFromImage(file, setOcrProgress);
      const lines = splitChatTextIntoLines(rawText);
      if (lines.length === 0) {
        throw new Error("Couldn't read any text in this image — try a clearer, less-cropped screenshot.");
      }

      setScreenshotStatus("analyzing");
      const result = await analysisApi.analyzeText(token, {
        lines,
        victimAlias: user?.name ?? "Citizen (chat screenshot)",
      });
      setScreenshotResult(result);
      // Unlock register immediately with the local preview — never block on Storage.
      attachPendingEvidence({ evidenceImageUrl: previewUrl });
      setScreenshotStatus("uploading");

      const uploaded = await uploadCaseEvidenceImage(result.caseId, file);
      if (uploaded) {
        // Prefer Firebase URL when available; otherwise compressed inline stays.
        attachPendingEvidence({ evidenceImageUrl: uploaded.url });
        setScreenshotStatus("done");
      } else {
        // Local preview already attached — still allow register.
        setScreenshotStatus("done");
      }
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
    setVoiceUploadStatus("uploading");
    setLocalRecordingPreviewUrl(null);
    try {
      // Keep a local preview immediately so the user can hear the file even if Storage fails.
      const localUrl = URL.createObjectURL(file);
      setLocalRecordingPreviewUrl(localUrl);

      const { base64, mimeType } = await fileToBase64WithMime(file);
      const result = await analysisApi.analyzeRecording(token, {
        audioBase64: base64,
        mimeType,
        victimAlias: user?.name ?? "Citizen (recorded call)",
        language: recordingLanguage,
      });
      setRecordingResult(result);
      setRecordingStatus("done");

      const durationMs = await getAudioDurationMs(file);

      // Attach inline copy FIRST (guarantees green badge) — then upgrade to Storage URL if available.
      let attached = false;
      if (file.size <= 3_500_000) {
        try {
          const dataUrl = await blobToDataUrl(file);
          attachPendingEvidence({ recordingUrl: dataUrl, durationMs: durationMs || undefined }, result.caseId);
          attached = true;
          setVoiceUploadStatus("done");
        } catch {
          // Fall through to Storage-only path below.
        }
      }

      const uploaded = await uploadCaseRecording(result.caseId, file, file.name);
      if (uploaded) {
        attachPendingEvidence({ recordingUrl: uploaded.url, durationMs: durationMs || undefined }, result.caseId);
        attached = true;
        setVoiceUploadStatus("done");
        URL.revokeObjectURL(localUrl);
        setLocalRecordingPreviewUrl(null);
      } else if (!attached) {
        // Last resort: blob URL works for this browser session only.
        attachPendingEvidence({ recordingUrl: localUrl, durationMs: durationMs || undefined }, result.caseId);
        setVoiceUploadStatus("error");
        setRecordingError(
          "Audio attached for this session, but Firebase Storage upload failed. Publish Storage rules for recordings/ so Historical Cases keeps playable audio after refresh.",
        );
      } else {
        setVoiceUploadStatus("done");
        URL.revokeObjectURL(localUrl);
        setLocalRecordingPreviewUrl(null);
      }
    } catch (err) {
      setRecordingError(err instanceof ApiClientError ? err.message : "Analysis failed. Please try again.");
      setRecordingStatus("error");
      setVoiceUploadStatus("error");
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

  function handleLanguageChange(next: RecognitionLanguage) {
    setLanguage(next);
    // Mid-session switch so English stays Latin and Hindi can use Devanagari
    if (isLiveActive && speech.isListening) {
      speech.setLanguage(next);
    }
  }

  async function handleStart() {
    // Start raw audio capture FIRST so Web Speech doesn't leave MediaRecorder
    // with an empty/stolen mic stream (common cause of silent evidence).
    const capture = await audioRecorder.start();
    startLiveSession();
    speech.start(language);

    if (!capture.ok) {
      console.warn("[live-mic] audio capture failed:", capture.error);
    }

    setLocationStatus("pending");
    try {
      const { lat, lng, accuracyMeters } = await getRealDeviceLocation();
      setCoords({ lat, lng });
      submitLiveLocation(lat, lng, accuracyMeters);
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
    setVoiceUploadStatus("uploading");
    setLocalRecordingPreviewUrl(null);

    void audioRecorder.stop().then(async ({ blob, durationMs: wallDurationMs, error: captureError }) => {
      if (!blob || !caseId) {
        setVoiceUploadStatus("error");
        if (captureError) {
          console.warn("[live-mic] no audio blob:", captureError);
        }
        return;
      }

      // Prefer wall-clock duration — MediaRecorder webm often reports wrong
      // duration in <audio>, which makes playback feel like 2x speed.
      const mediaDurationMs = await getAudioDurationMs(blob);
      const durationMs = Math.max(wallDurationMs, mediaDurationMs);

      const localUrl = URL.createObjectURL(blob);
      setLocalRecordingPreviewUrl(localUrl);

      let attached = false;
      // Prefer Firebase Storage for live mic (keeps RTDB small). Inline only as backup.
      const uploaded = await uploadCaseRecording(caseId, blob);
      if (uploaded) {
        attachPendingEvidence({ recordingUrl: uploaded.url, durationMs: durationMs || undefined }, caseId);
        attached = true;
        setVoiceUploadStatus("done");
        if (uploaded.source === "firebase") {
          URL.revokeObjectURL(localUrl);
          setLocalRecordingPreviewUrl(null);
        }
      }

      if (!attached && blob.size <= 3_500_000) {
        try {
          const dataUrl = await blobToDataUrl(blob);
          attachPendingEvidence({ recordingUrl: dataUrl, durationMs: durationMs || undefined }, caseId);
          attached = true;
          setVoiceUploadStatus("done");
        } catch {
          // fall through
        }
      }

      if (!attached) {
        attachPendingEvidence({ recordingUrl: localUrl, durationMs: durationMs || undefined }, caseId);
        setVoiceUploadStatus("error");
      }
    });
  }

  const screenshotEvidenceReady =
    pendingRegistration?.source !== "screenshot-upload" || Boolean(pendingRegistration.evidenceImageUrl);

  const canRegister =
    screenshotEvidenceReady &&
    (pendingRegistration?.source === "screenshot-upload" ||
      Boolean(pendingRegistration?.recordingUrl) ||
      voiceUploadStatus !== "uploading");

  async function handleRegisterCase() {
    if (!canRegister) return;
    setRegistering(true);
    await registerPendingCase();
    setRegistering(false);
    setVoiceUploadStatus("idle");
    setLocalRecordingPreviewUrl(null);
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
    <div className="flex flex-col gap-3 p-3.5 pb-10">
      {!isLiveActive && pendingRegistration && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
          <div className="flex items-start gap-2 text-[11px] text-text-secondary">
            <FolderPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              Analysis finished for{" "}
              <span className="font-mono text-text-primary">{pendingRegistration.id}</span> — score{" "}
              <strong className="text-text-primary">
                {pendingRegistration.finalScore}/100 ({pendingRegistration.threatLevel.toUpperCase()})
              </strong>
              . Nothing is in the database yet. Register only if you want this counted as a real case
              (threat or not — sometimes you just need a record of a clean check).
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
            {pendingRegistration.recordingUrl ? (
              <Badge tone="success">Voice evidence attached</Badge>
            ) : voiceUploadStatus === "uploading" ? (
              <Badge tone="warning">Voice uploading…</Badge>
            ) : (
              <Badge tone="neutral">Voice evidence pending / none</Badge>
            )}
            {pendingRegistration.evidenceImageUrl ? (
              <Badge tone="success">Screenshot evidence attached</Badge>
            ) : null}
            <Badge tone="warning">Will save as ONGOING</Badge>
          </div>
          {pendingRegistration.recordingUrl && (
            <div className="rounded-md border border-success/30 bg-success/10 p-2">
              <p className="mb-1.5 text-[10px] font-medium text-success">Voice evidence ready — play below</p>
              <AudioPlayer src={pendingRegistration.recordingUrl} />
            </div>
          )}
          {!pendingRegistration.recordingUrl && localRecordingPreviewUrl && (
            <div className="rounded-md border border-border-strong bg-surface-raised/40 p-2">
              <p className="mb-1.5 text-[10px] font-medium text-text-secondary">Local voice preview</p>
              <AudioPlayer src={localRecordingPreviewUrl} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleRegisterCase}
              disabled={registering || !canRegister}
              title={
                canRegister
                  ? "Saves as ONGOING only — never auto-completes"
                  : "Wait until evidence upload finishes (green badge)"
              }
            >
              {registering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}{" "}
              Yes — register as ONGOING
            </Button>
            <Button size="sm" variant="ghost" onClick={discardPendingRegistration} disabled={registering}>
              <Trash2 className="h-3.5 w-3.5" /> No — discard
            </Button>
          </div>
          {!pendingRegistration.recordingUrl && pendingRegistration.source !== "screenshot-upload" && (
            <p className="text-[10px] text-warning">
              {voiceUploadStatus === "uploading"
                ? "Saving voice evidence… green badge appears when attached."
                : voiceUploadStatus === "error"
                  ? "Could not persist audio to Firebase Storage. If preview plays above, you can still register — publish Storage rules for recordings/ for permanent playback."
                  : "Voice evidence not attached yet."}
            </p>
          )}
          {!pendingRegistration.evidenceImageUrl && pendingRegistration.source === "screenshot-upload" && (
            <>
              {screenshotPreviewUrl && (
                <div className="rounded-md border border-border-strong bg-surface-raised/40 p-2">
                  <p className="mb-1.5 text-[10px] font-medium text-text-secondary">Chat screenshot (local preview)</p>
                  <img
                    src={screenshotPreviewUrl}
                    alt="WhatsApp chat screenshot preview"
                    className="max-h-28 w-full rounded border border-border object-contain"
                  />
                </div>
              )}
              <p className="text-[10px] text-warning">
                {screenshotStatus === "uploading"
                  ? "Saving screenshot (max ~20s) — if Firebase Storage hangs we attach a compressed copy automatically."
                  : "Screenshot evidence not attached yet. Wait for the green \"Screenshot evidence attached\" badge before registering so Historical Cases shows the chat image."}
              </p>
            </>
          )}
          {pendingRegistration.evidenceImageUrl && pendingRegistration.source === "screenshot-upload" && (
            <div className="rounded-md border border-border-strong bg-surface-raised/40 p-2">
              <p className="mb-1.5 text-[10px] font-medium text-success">Screenshot ready — you can register now</p>
              <img
                src={pendingRegistration.evidenceImageUrl}
                alt="WhatsApp chat screenshot evidence"
                className="max-h-28 w-full rounded border border-border object-contain"
              />
            </div>
          )}
        </div>
      )}

      <details className="glass-panel rounded-lg border border-border p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-primary">
          <Fingerprint className="h-3.5 w-3.5 text-primary" />
          Live Mic Session — how it works
        </summary>
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
          Put a suspicious call on speakerphone near this device. Browser speech recognition transcribes live; the
          same threat engine analyzes the words. Numbers / UPI / links mentioned out loud are checked against intel
          sources.
        </p>
        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-text-muted">
          <strong className="text-text-secondary">IP tracking note:</strong> a normal phone call never carries the
          caller&apos;s IP to your phone. Domain lookup only fires on a link the scammer mentions — not the phone
          line. Telecom CDR requires police.
        </p>
      </details>

      {lastRegisteredCaseId && !isLiveActive && !caseRegistryError && !pendingRegistration && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-2.5 text-[11px] text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Case <span className="font-mono">{lastRegisteredCaseId}</span> is now{" "}
            <strong>ONGOING</strong> in the database with its evidence. Open{" "}
            <strong>Cases</strong> or <strong>Historical Cases</strong> to review / delete it, or{" "}
            <strong>Mark Complete</strong> when the investigation finishes — Analytics updates live.
          </span>
        </div>
      )}

      {caseRegistryError && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-[11px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Case was NOT saved:</strong> {caseRegistryError}
          </span>
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
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-text-muted">Transcript script:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en-IN")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    language === "en-IN"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  English + Hinglish
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("hi-IN")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    language === "hi-IN"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  हिन्दी (देवनागरी)
                </button>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-text-muted">
              {language === "en-IN"
                ? "English bologe → English me likhega. Hinglish Roman me aayega. Mixed calls ke liye yehi best hai."
                : "Shuddh Hindi (देवनागरी) ke liye. English words bhi Devanagari me aa sakte hain — mixed call pe pehla option use karo."}
            </p>
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
              Upload the audio — long calls are chunked so the{" "}
              <strong className="text-text-secondary">full conversation</strong> is covered from real Whisper STT (no
              demo script). English stays English; non-Latin Hindi is romanized only. Victim/scammer labels come from
              real AI — if that fails, lines show UNKNOWN (never a fake guess).
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-text-muted">Transcript language:</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "auto" as const, label: "Auto (EN + Hinglish)" },
                    { id: "hi" as const, label: "Hinglish (Roman)" },
                    { id: "en" as const, label: "English only" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRecordingLanguage(opt.id)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px]",
                      recordingLanguage === opt.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border-strong text-text-secondary hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
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
                <Loader2 className="h-3 w-3 animate-spin" /> Transcribing full audio (long calls use multiple chunks) —
                watch the panels above update…
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
              screenshot — text is extracted on this device (OCR). Real AI labels each message as scammer or victim; if
              AI is down, labels show UNKNOWN (no fake fallback).
            </p>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              disabled={
                screenshotStatus === "reading" ||
                screenshotStatus === "analyzing" ||
                screenshotStatus === "uploading"
              }
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
            {screenshotStatus === "uploading" && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving WhatsApp/chat screenshot to evidence storage…
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
            <Button variant="danger" size="sm" onClick={handleStop}>
              <MicOff className="h-3.5 w-3.5" /> Stop Session
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

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-text-muted">Transcript script:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en-IN")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    language === "en-IN"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  English + Hinglish
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("hi-IN")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    language === "hi-IN"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-text-secondary hover:border-primary/40",
                  )}
                >
                  हिन्दी (देवनागरी)
                </button>
              </div>
            </div>
            <p className="text-[10px] text-text-muted">
              Live session ke dauran bhi switch kar sakte ho — English ke liye pehla, shuddh Hindi ke liye doosra.
            </p>
          </div>

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
