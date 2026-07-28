import { useCallback, useEffect, useRef, useState } from "react";

export type RecognitionLanguage = "en-IN" | "hi-IN";

interface UseWebSpeechRecognitionOptions {
  onFinalResult: (text: string) => void;
}

/**
 * Wraps the browser's native Web Speech API — completely free, no API key,
 * no signup, built into Chrome/Edge.
 *
 * Important: Chrome can only run ONE recognition language at a time.
 * - en-IN → English + Roman Hinglish stay in Latin script (what you want when
 *   speaking English / Hinglish mixed).
 * - hi-IN → Hindi in Devanagari, but English words often get forced into
 *   Devanagari phonetics ("haven't" → "हेवन'टी") — use only for pure Hindi.
 */
const RESTART_DELAY_MS = 250;
const MAX_CONSECUTIVE_RESTART_FAILURES = 3;

export function useWebSpeechRecognition({ onFinalResult }: UseWebSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const languageRef = useRef<RecognitionLanguage>("en-IN");
  const wantsListeningRef = useRef(false);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const isSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const createAndStart = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = languageRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      consecutiveFailuresRef.current = 0;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const cleaned = transcript.trim();
          if (cleaned) onFinalResultRef.current(cleaned);
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantsListeningRef.current = false;
        setError("Microphone permission was denied or revoked. Grant mic access and click Start again.");
        return;
      }
      if (event.error === "audio-capture") {
        wantsListeningRef.current = false;
        setError("No microphone was found. Check that a mic is connected and not in use by another app.");
        return;
      }
      setError(`Speech recognition error: ${event.error} — restarting…`);
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition || !wantsListeningRef.current) return;

      restartTimeoutRef.current = setTimeout(() => {
        if (!wantsListeningRef.current) return;
        try {
          createAndStart();
        } catch {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_RESTART_FAILURES) {
            wantsListeningRef.current = false;
            setIsListening(false);
            setError("Speech recognition kept failing to restart. Click Stop, then Start again.");
          }
        }
      }, RESTART_DELAY_MS);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const start = useCallback(
    (language: RecognitionLanguage = "en-IN") => {
      if (!isSupported) {
        setError("This browser doesn't support live speech recognition. Please use Chrome or Edge.");
        return;
      }

      clearRestartTimeout();
      recognitionRef.current?.abort();
      recognitionRef.current = null;

      languageRef.current = language;
      wantsListeningRef.current = true;
      setError(null);
      setIsListening(true);
      consecutiveFailuresRef.current = 0;
      createAndStart();
    },
    [isSupported, clearRestartTimeout, createAndStart],
  );

  /** Switch script mid-session without ending the live case (en ↔ hi). */
  const setLanguage = useCallback(
    (language: RecognitionLanguage) => {
      languageRef.current = language;
      if (!wantsListeningRef.current) return;

      clearRestartTimeout();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      consecutiveFailuresRef.current = 0;
      setInterimText("");
      setError(null);
      createAndStart();
    },
    [clearRestartTimeout, createAndStart],
  );

  const stop = useCallback(() => {
    wantsListeningRef.current = false;
    clearRestartTimeout();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
    try {
      recognition?.stop();
    } catch {
      // ignore
    }
  }, [clearRestartTimeout]);

  useEffect(
    () => () => {
      wantsListeningRef.current = false;
      clearRestartTimeout();
      recognitionRef.current?.abort();
    },
    [clearRestartTimeout],
  );

  return { isSupported, isListening, interimText, error, start, stop, setLanguage };
}
