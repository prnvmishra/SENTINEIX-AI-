import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, Maximize2, MessageCircle, Minimize2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { analysisApi, type AdvisorChatContext } from "@/services/analysisApi";
import { ApiClientError } from "@/services/apiClient";
import { cn } from "@/utils/cn";

type ChatTurn = { id: string; role: "user" | "assistant"; content: string; model?: string; fallback?: boolean };

const QUICK_PROMPTS = [
  "Ab aage kya karun?",
  "Kya yeh scam hai?",
  "Police ko report kaise karun?",
  "Paise transfer ho gaye — ab kya?",
];

const WELCOME: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content:
    "Main aapka investigation advisor hoon. Is case ke threat score, transcript aur signals pe based — poochho “Ab aage kya karun?” ya kuch aur.",
  model: "sentinelx",
};

function useAdvisorChat(context: AdvisorChatContext) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatTurn[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!token) {
      setError("Sign in required to chat with the AI advisor.");
      return;
    }

    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    setMessages((previous) => [...previous, userTurn]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const history = [...messages, userTurn]
        .filter((turn) => turn.id !== "welcome")
        .map((turn) => ({ role: turn.role, content: turn.content }));

      const result = await analysisApi.advisorChat(token, {
        message: trimmed,
        history: history.slice(0, -1),
        context,
      });

      setMessages((previous) => [
        ...previous,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          model: result.model,
          fallback: result.fallback,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Advisor chat failed — try again.");
    } finally {
      setSending(false);
    }
  }

  return { messages, input, setInput, sending, error, sendMessage };
}

function ChatView({
  fullscreen,
  quotaExhausted,
  onToggleFullscreen,
  className,
  messages,
  input,
  setInput,
  sending,
  error,
  onSend,
}: {
  fullscreen?: boolean;
  quotaExhausted?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
  messages: ChatTurn[];
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  error: string | null;
  onSend: (text: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onSend(input);
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-raised/30", className)}>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-3 py-2">
        <MessageCircle className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {fullscreen ? "AI Investigation Advisor — Full screen" : "Ask AI — next steps"}
        </span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
          Live case context
        </span>
        {quotaExhausted && <span className="text-[9px] text-warning">OpenRouter quota low · using Groq when available</span>}
        <div className="ml-auto flex items-center gap-1">
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-md p-1.5 text-text-muted transition hover:bg-surface hover:text-primary"
              title={fullscreen ? "Exit full screen (Esc)" : "Open full screen chat"}
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          )}
          {fullscreen && onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-md p-1.5 text-text-muted transition hover:bg-surface hover:text-danger"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2",
          fullscreen && "px-4 py-4 md:px-8",
        )}
      >
        {messages.map((turn) => (
          <div key={turn.id} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap",
                fullscreen ? "max-w-[min(720px,85%)] text-sm" : "max-w-[92%] text-[11px]",
                turn.role === "user"
                  ? "bg-primary/20 text-text-primary"
                  : "border border-border bg-bg/70 text-text-secondary",
              )}
            >
              {turn.role === "assistant" && (
                <div className="mb-1 flex items-center gap-1 text-[9px] font-medium text-primary">
                  <Sparkles className="h-2.5 w-2.5" /> AI Advisor
                  {turn.fallback || turn.model === "none"
                    ? " · unavailable"
                    : turn.model
                      ? ` · ${turn.model.split("/").pop()}`
                      : ""}
                </div>
              )}
              {turn.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking with live case context…
          </div>
        )}
      </div>

      <div className={cn("shrink-0 space-y-1.5 border-t border-border/60 p-2", fullscreen && "p-4 md:px-8")}>
        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => void onSend(prompt)}
              className="rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[10px] text-text-secondary transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        {error && <p className="text-[10px] text-danger">{error}</p>}
        <form onSubmit={handleSubmit} className={cn("flex gap-1.5", fullscreen && "mx-auto max-w-4xl")}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ab aage kya karun? / What should I do next?"
            disabled={sending}
            className={cn(
              "min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-text-primary outline-none placeholder:text-text-muted focus:border-primary",
              fullscreen ? "py-2.5 text-sm" : "text-[11px]",
            )}
          />
          <Button type="submit" size="sm" disabled={sending || !input.trim()} className="shrink-0">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ThreatAdvisorChat({
  context,
  quotaExhausted = false,
}: {
  context: AdvisorChatContext;
  quotaExhausted?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const chat = useAdvisorChat(context);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const viewProps = {
    ...chat,
    quotaExhausted,
    onSend: chat.sendMessage,
  };

  return (
    <>
      <ChatView
        {...viewProps}
        onToggleFullscreen={() => setFullscreen(true)}
        className="border-t border-border"
      />
      {fullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex flex-col bg-bg/95 backdrop-blur-sm">
            <ChatView
              {...viewProps}
              fullscreen
              onToggleFullscreen={() => setFullscreen(false)}
              className="h-full border-none bg-bg"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
