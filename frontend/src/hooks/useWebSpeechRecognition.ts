import { useCallback, useEffect, useRef, useState } from "react";

export type RecognitionLanguage = "en-IN" | "hi-IN";

interface UseWebSpeechRecognitionOptions {
  onFinalResult: (text: string) => void;
}

/**
 * Wraps the browser's native Web Speech API — completely free, no API key,
 * no signup, built into Chrome/Edge. Captures real microphone audio and
 * streams back real transcribed text as the user speaks. This is genuine
 * live speech-to-text, not a mock.
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
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const isSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback((language: RecognitionLanguage = "en-IN") => {
    if (!isSupported) {
      setError("This browser doesn't support live speech recognition. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const wantsListening = { current: true };

    function createAndStart(): void {
      const recognition = new SpeechRecognitionCtor!();
      recognition.lang = language;
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
            onFinalResultRef.current(transcript);
          } else {
            interim += transcript;
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          wantsListening.current = false;
          setError("Microphone permission was denied or revoked. Grant mic access and click Start again.");
          return;
        }
        if (event.error === "audio-capture") {
          wantsListening.current = false;
          setError("No microphone was found. Check that a mic is connected and not in use by another app.");
          return;
        }
        setError(`Speech recognition error: ${event.error} — restarting…`);
      };

      recognition.onend = () => {
        // Web Speech API auto-stops after ~short periods of silence, or after
        // one utterance on some browsers — restart while the user intends to
        // keep listening so the session feels continuous rather than dropping
        // speech. A short delay avoids Chrome's InvalidStateError from
        // restarting the engine in the same tick it just stopped in.
        if (recognitionRef.current !== recognition || !wantsListening.current) return;

        restartTimeoutRef.current = setTimeout(() => {
          if (!wantsListening.current) return;
          try {
            createAndStart();
          } catch {
            consecutiveFailuresRef.current += 1;
            if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_RESTART_FAILURES) {
              wantsListening.current = false;
              setError("Speech recognition kept failing to restart. Click Stop, then Start again.");
            }
          }
        }, RESTART_DELAY_MS);
      };

      recognitionRef.current = recognition;
      recognition.start();
    }

    setError(null);
    setIsListening(true);
    consecutiveFailuresRef.current = 0;
    createAndStart();
  }, [isSupported]);

  const stop = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
    recognition?.stop();
  }, []);

  useEffect(
    () => () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      recognitionRef.current?.stop();
    },
    [],
  );

  return { isSupported, isListening, interimText, error, start, stop };
}
