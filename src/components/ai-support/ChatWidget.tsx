"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { VoiceButton, canRecordVoice } from "./VoiceButton";
import { OPEN_CHAT_EVENT } from "@/lib/ai-support/events";
import type { Message, SSEMessage, WidgetConfig } from "@/lib/ai-support/types";
import {
  captureLead,
  connectSSE,
  escalateConversation,
  fetchMessages,
  fetchWidgetConfig,
  getVisitorSessionId,
  recallConversation,
  rememberConversation,
  sendMessage,
  startConversation,
} from "@/lib/ai-support/chat-client";
import { WhatsAppIcon } from "@/components/catalog/WhatsAppIcon";
import { cn } from "@/lib/utils";

type ChatMessage = Message | SSEMessage;

/** Give up on the typing indicator if no reply arrives in this long. */
const REPLY_TIMEOUT_MS = 90_000;

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g;

/**
 * Render message text with markdown-style and bare links made clickable.
 * Only http(s) and same-site paths become links; everything else is text.
 */
function MessageText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));

    const href = match[2] ?? match[3];
    const label = match[1] ?? match[3];
    const external = href.startsWith("http");

    parts.push(
      <a
        key={index}
        href={href}
        className="underline underline-offset-2 break-words"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {label}
      </a>,
    );
    last = index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isCustomer = msg.direction === "inbound";
  const isSystem = msg.sender_type === "system";
  const isAgent = msg.sender_type === "agent";

  return (
    <div
      className={cn(
        "flex flex-col",
        isCustomer ? "items-end" : isSystem ? "items-center" : "items-start",
      )}
    >
      {isAgent && (
        <span className="mb-0.5 px-1 text-[10px] text-muted-foreground">Floor Nigeria team</span>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isSystem && "bg-muted text-center text-xs text-muted-foreground",
          isCustomer && "bg-primary text-primary-foreground",
          !isCustomer && !isSystem && "bg-muted text-foreground",
        )}
      >
        <MessageText text={msg.content} />
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div
      className="mr-auto flex gap-1 rounded-2xl bg-muted px-4 py-3"
      aria-label="Assistant is typing"
    >
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}

function ChatInput({
  onSend,
  disabled,
  voiceInput,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  voiceInput: boolean;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceSupported] = useState(canRecordVoice);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const showVoice = voiceInput && voiceSupported && !text.trim();

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-end gap-2 border-t p-3">
      {!recording && (
        <>
          <label htmlFor="ai-chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="ai-chat-input"
            ref={inputRef}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about floors, prices or installation…"
            rows={1}
            className="max-h-24 min-h-9 flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </>
      )}
      {showVoice ? (
        <VoiceButton
          disabled={disabled}
          onRecordingChange={setRecording}
          onTranscript={(transcript) => onSend(transcript)}
        />
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          aria-label="Send message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22 11 13 2 9z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function LeadForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (details: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || (!phone.trim() && !email.trim())) {
      setError("Add your name and a phone number or email.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't save your details. Please try again.",
      );
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={submit} className="space-y-2 border-t bg-muted/40 p-3">
      <p className="text-xs font-medium">
        Leave your details and our sales team will call you back.
      </p>
      <input
        className={field}
        placeholder="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Your name"
      />
      <div className="flex gap-2">
        <input
          className={field}
          placeholder="Phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-label="Phone"
        />
        <input
          className={field}
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
      </div>
      <input
        className={field}
        placeholder="Anything we should know? (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        aria-label="Notes"
      />
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send details"}
        </button>
      </div>
    </form>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaiting = useCallback(() => {
    setAwaitingReply(false);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = null;
  }, []);

  const startWaiting = useCallback(() => {
    setAwaitingReply(true);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => setAwaitingReply(false), REPLY_TIMEOUT_MS);
  }, []);

  useEffect(
    () => () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    },
    [],
  );

  // The widget stays hidden until the backend confirms the website channel is on.
  useEffect(() => {
    let cancelled = false;

    fetchWidgetConfig()
      .then((nextConfig) => {
        if (!cancelled) setConfig(nextConfig);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Pick up a thread started earlier in this tab.
  useEffect(() => {
    if (!config?.enabled) return;

    const saved = recallConversation();
    if (!saved) return;

    let cancelled = false;

    fetchMessages(saved)
      .then(({ data }) => {
        if (cancelled) return;
        setConversationId(saved);
        setMessages(data);
        lastIdRef.current = data.reduce((max, m) => Math.max(max, m.id), 0);
      })
      .catch(() => rememberConversation(null));

    return () => {
      cancelled = true;
    };
  }, [config?.enabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, awaitingReply, showLeadForm]);

  // Stream replies while the window is open.
  useEffect(() => {
    if (!conversationId || !open) return;

    const connection = connectSSE(conversationId, lastIdRef.current, (msg) => {
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);

      if (msg.direction !== "outbound") return;

      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      stopWaiting();
    });

    return () => connection.close();
  }, [conversationId, open, stopWaiting]);

  const appendLocalMessage = useCallback((text: string) => {
    const localMsg: SSEMessage = {
      id: -Date.now(),
      direction: "inbound",
      sender_type: "customer",
      content: text,
      content_type: "text",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, localMsg]);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (sending) return;

      setSending(true);
      setError(null);
      appendLocalMessage(text);

      try {
        if (!conversationId) {
          const { conversation_id } = await startConversation(text, getVisitorSessionId());

          // Replace the optimistic bubble with the stored message, and read
          // any reply that was fast enough to land already.
          const { data } = await fetchMessages(conversation_id);
          setMessages(data);
          lastIdRef.current = data.reduce((max, m) => Math.max(max, m.id), 0);
          rememberConversation(conversation_id);
          setConversationId(conversation_id);

          if (!data.some((m) => m.direction === "outbound")) startWaiting();
        } else {
          await sendMessage(conversationId, text, crypto.randomUUID());
          if (!escalated) startWaiting();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "We couldn't send that message. Please try again.",
        );
      } finally {
        setSending(false);
      }
    },
    [appendLocalMessage, conversationId, escalated, sending, startWaiting],
  );

  // Other parts of the site (the floor finder) open the chat with a question
  // already asked: window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { message } })).
  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      setOpen(true);
      const message = (event as CustomEvent<{ message?: string }>).detail?.message?.trim();
      if (message) void handleSendRef.current(message.slice(0, 2000));
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  const handleEscalate = async () => {
    if (!conversationId) return;

    try {
      await escalateConversation(conversationId, "Customer requested human support");
      setEscalated(true);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't reach our team. Please try again.",
      );
    }
  };

  const handleLead = async (details: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => {
    let id = conversationId;

    // Someone may want a callback before typing anything else.
    if (!id) {
      const started = await startConversation(
        "I'd like a callback from your sales team.",
        getVisitorSessionId(),
      );
      id = started.conversation_id;
      rememberConversation(id);
      setConversationId(id);
    }

    await captureLead(id, details);
    setLeadSent(true);
    setShowLeadForm(false);

    const { data } = await fetchMessages(id);
    setMessages(data);
    lastIdRef.current = data.reduce((max, m) => Math.max(max, m.id), 0);
  };

  const handleNewChat = () => {
    rememberConversation(null);
    setConversationId(null);
    setMessages([]);
    setEscalated(false);
    setLeadSent(false);
    setShowLeadForm(false);
    stopWaiting();
    lastIdRef.current = 0;
  };

  if (!config?.enabled) return null;

  const isRight = config.position !== "bottom-left";
  const themeColor = config.theme_color || undefined;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
            isRight ? "right-4 sm:right-6" : "left-4 sm:left-6",
          )}
          style={themeColor ? { backgroundColor: themeColor } : undefined}
          aria-label="Chat with Floor Nigeria"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Floor Nigeria chat"
          className={cn(
            "fixed bottom-4 z-50 flex h-[min(560px,calc(100dvh-2rem))] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
            isRight ? "right-4 sm:right-6" : "left-4 sm:left-6",
          )}
        >
          <div
            className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground"
            style={themeColor ? { backgroundColor: themeColor } : undefined}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">Floor Nigeria</p>
              <p className="text-xs opacity-80">
                {escalated ? "Waiting for our team" : "AI assistant · replies in seconds"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {config.whatsapp_url && (
                <a
                  href={config.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1.5 hover:bg-white/20"
                  aria-label="Continue on WhatsApp"
                  title="Continue on WhatsApp"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              )}
              {conversationId && (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="rounded-md px-2 py-1 text-[11px] hover:bg-white/20"
                >
                  New chat
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/20"
                aria-label="Close chat"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-2 text-center">
                <p className="text-sm">{config.greeting}</p>
                <p className="text-[11px] text-muted-foreground">
                  You&apos;re chatting with an AI assistant. Prices and stock are checked live; our
                  team can take over at any time.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {(sending || awaitingReply) && <TypingDots />}
          </div>

          {error && (
            <div
              role="alert"
              className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          {showLeadForm ? (
            <LeadForm onSubmit={handleLead} onCancel={() => setShowLeadForm(false)} />
          ) : (config.lead_capture && !leadSent) ||
            (config.human_support && conversationId && !escalated) ? (
            <div className="flex gap-2 border-t px-3 py-2">
              {config.lead_capture && !leadSent && (
                <button
                  type="button"
                  onClick={() => setShowLeadForm(true)}
                  className="flex-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
                >
                  Request a callback
                </button>
              )}
              {config.human_support && conversationId && !escalated && (
                <button
                  type="button"
                  onClick={handleEscalate}
                  className="flex-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
                >
                  Talk to a person
                </button>
              )}
            </div>
          ) : null}

          <ChatInput
            onSend={handleSend}
            disabled={sending}
            voiceInput={Boolean(config.voice_input)}
          />
        </div>
      )}
    </>
  );
}
