"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCheck,
  Send,
  StickyNote,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@/lib/ai-support/types";

/**
 * Agent conversation detail page — client-side fetching with 5s polling.
 *
 * All API calls go through the existing admin proxy at /api/admin/[...path]
 * which forwards to Laravel's /v1/admin/* endpoints.
 */

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/ai-support/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;

    try {
      const payload = (await res.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // Not JSON.
    }

    throw new Error(message);
  }

  return res.json();
}

const CHANNEL_LABEL: Record<Conversation["channel"], string> = {
  website: "Website chat",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

function DeliveryNote({ msg }: { msg: Message }) {
  if (msg.direction !== "outbound" || msg.is_internal_note) return null;

  if (msg.delivery_status === "failed") {
    return (
      <p className="mt-1 flex items-start gap-1 text-[11px] text-red-200">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        Not delivered{msg.metadata?.delivery_error ? ` — ${msg.metadata.delivery_error}` : ""}
      </p>
    );
  }

  if (msg.delivery_status === "read") {
    return <CheckCheck className="mt-1 h-3 w-3 opacity-80" aria-label="Read" />;
  }

  return null;
}

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copilotDraft, setCopilotDraft] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then(({ id }) => setConversationId(id));
  }, [params]);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      const data = await adminFetch<Conversation>(`conversations/${conversationId}`);
      setConversation(data);
      setLoadError(null);
    } catch (err) {
      // Keep showing the last good copy while polling; only the first load blocks.
      setLoadError(err instanceof Error ? err.message : "Could not load this conversation.");
    }
  }, [conversationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polls the API; state is set after the fetch resolves
    fetchConversation();
    const interval = setInterval(fetchConversation, 5000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  /** Run an action, surface its error, then refresh the thread. */
  const run = (action: () => Promise<void>) => {
    startTransition(async () => {
      setActionError(null);

      try {
        await action();
        await fetchConversation();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "That didn't work. Please try again.");
      }
    });
  };

  const handleReply = () => {
    if (!replyText.trim() || !conversationId) return;

    run(async () => {
      await adminFetch(`conversations/${conversationId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: replyText }),
      });
      setReplyText("");
      setCopilotDraft(null);
    });
  };

  const handleNote = () => {
    if (!noteText.trim() || !conversationId) return;

    run(async () => {
      await adminFetch(`conversations/${conversationId}/note`, {
        method: "POST",
        body: JSON.stringify({ content: noteText }),
      });
      setNoteText("");
      setShowNotes(false);
    });
  };

  const post = (action: string) => () => {
    if (!conversationId) return;
    run(async () => {
      await adminFetch(`conversations/${conversationId}/${action}`, { method: "POST" });
    });
  };

  const handleCopilot = () => {
    if (!conversationId) return;

    run(async () => {
      const result = await adminFetch<{ draft: string; message?: string | null }>(
        `conversations/${conversationId}/copilot-draft`,
        { method: "POST" },
      );
      if (!result.draft) {
        throw new Error(result.message || "The AI could not draft a reply. Try again.");
      }
      setCopilotDraft(result.draft);
      setReplyText(result.draft);
    });
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        {loadError ? (
          <p role="alert" className="text-sm text-red-700">
            {loadError}
          </p>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  const messages = conversation.messages ?? [];
  const isHumanMode = conversation.ai_mode === "paused_human_takeover";
  const displayName =
    conversation.user?.name ?? conversation.contact_name ?? conversation.contact_phone ?? "Visitor";
  const contactLine = [
    conversation.contact_phone,
    conversation.contact_email ?? conversation.user?.email,
  ]
    .filter(Boolean)
    .join(" · ");
  const replyWindowClosed = conversation.can_reply === false;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/support")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              {displayName}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                · {CHANNEL_LABEL[conversation.channel]}
              </span>
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {contactLine && <>{contactLine} · </>}
              <span className="capitalize">{conversation.status}</span>
              {isHumanMode && " · Human mode"}
              {conversation.ai_mode === "paused_escalated" && " · Waiting for an agent"}
            </p>
            {conversation.lead && (
              <Link
                href={`/admin/leads/${conversation.lead.id}`}
                className="text-xs font-medium underline underline-offset-2"
              >
                Lead #{conversation.lead.id} · {conversation.lead.status}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isHumanMode ? (
            <button
              type="button"
              onClick={post("takeover")}
              disabled={isPending}
              className="btn btn-outline flex h-8 items-center gap-1.5 rounded-md px-3 text-xs"
            >
              <UserCheck className="h-3.5 w-3.5" /> Take over
            </button>
          ) : (
            <button
              type="button"
              onClick={post("return-to-ai")}
              disabled={isPending}
              className="btn btn-outline flex h-8 items-center gap-1.5 rounded-md px-3 text-xs"
            >
              <Bot className="h-3.5 w-3.5" /> Return to AI
            </button>
          )}
          <button
            type="button"
            onClick={post("resolve")}
            disabled={isPending || conversation.status === "resolved"}
            className="btn btn-outline h-8 rounded-md px-3 text-xs"
          >
            Resolve
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.map((msg: Message) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[70%] whitespace-pre-line rounded-xl px-4 py-2.5 text-sm",
              msg.is_internal_note &&
                "mx-auto border-2 border-dashed border-yellow-400 bg-yellow-50 dark:bg-yellow-950",
              msg.direction === "inbound" && !msg.is_internal_note && "mr-auto bg-muted",
              msg.direction === "outbound" &&
                !msg.is_internal_note &&
                "ml-auto bg-primary text-primary-foreground",
              msg.delivery_status === "failed" && !msg.is_internal_note && "ring-2 ring-red-500",
            )}
          >
            <div className="mb-1 flex items-center gap-2 text-[10px] opacity-70">
              <span className="capitalize">
                {msg.is_internal_note ? "Internal note" : msg.sender_type}
              </span>
              <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
              {msg.is_internal_note && <StickyNote className="h-3 w-3 text-yellow-600" />}
              {msg.metadata?.voice && (
                <span className="rounded bg-black/10 px-1.5 py-0.5 font-semibold">
                  {msg.metadata.transcribed
                    ? "🎤 Voice note · transcribed"
                    : msg.metadata.transcription_failed
                      ? "🎤 Voice note · could not transcribe"
                      : "🎤 Voice note"}
                </span>
              )}
            </div>
            {msg.content}
            <DeliveryNote msg={msg} />
          </div>
        ))}
      </div>

      {actionError && (
        <div
          role="alert"
          className="border-t border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700"
        >
          {actionError}
        </div>
      )}

      {copilotDraft && (
        <div className="border-t bg-blue-50 px-6 py-2 dark:bg-blue-950">
          <p className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <Bot className="h-3 w-3" /> Copilot suggestion loaded into the reply box — review and
            edit before sending.
          </p>
        </div>
      )}

      {replyWindowClosed && !showNotes && (
        <div className="border-t bg-amber-50 px-6 py-2 text-xs text-amber-900">
          WhatsApp&apos;s 24-hour reply window has closed. The customer has to message again before
          a reply can be delivered — call them on {conversation.contact_phone ?? "their number"}{" "}
          instead, or add an internal note.
        </div>
      )}

      <div className="border-t p-4">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <StickyNote className="h-3 w-3" /> {showNotes ? "Switch to reply" : "Add note"}
          </button>
          <button
            type="button"
            onClick={handleCopilot}
            disabled={isPending}
            className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Bot className="h-3 w-3" /> AI copilot
          </button>
        </div>

        {showNotes ? (
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Internal note (not visible to customer)…"
              aria-label="Internal note"
              rows={2}
              className="flex-1 rounded-lg border bg-yellow-50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-500 dark:bg-yellow-950"
            />
            <button
              type="button"
              onClick={handleNote}
              disabled={isPending || !noteText.trim()}
              className="btn btn-outline h-auto rounded-lg px-3"
              aria-label="Save note"
            >
              <StickyNote className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
              placeholder={replyWindowClosed ? "Reply window closed" : "Type your reply…"}
              aria-label="Reply"
              disabled={replyWindowClosed}
              rows={2}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={isPending || !replyText.trim() || replyWindowClosed}
              className="btn btn-primary h-auto rounded-lg px-3"
              aria-label="Send reply"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
