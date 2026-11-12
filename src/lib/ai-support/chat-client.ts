/**
 * Browser-side AI Support chat client.
 *
 * All calls route through Next.js API Route Handlers (no direct Laravel calls
 * from the browser, matching the existing storefront pattern).
 */

import type { Message, SSEMessage, WidgetConfig } from "./types";

const BASE = "/api/ai-support";

function visitorSessionHeaders(): Record<string, string> {
  try {
    return { "X-Visitor-Session": getVisitorSessionId() };
  } catch {
    // localStorage is unavailable during SSR.
    return {};
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...visitorSessionHeaders(),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `AI Support API error: ${res.status}`;

    try {
      const payload = (await res.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // Response was not JSON.
    }

    throw new Error(message);
  }

  return res.json();
}

/**
 * Fetch widget configuration (public, no auth).
 */
export async function fetchWidgetConfig(): Promise<WidgetConfig> {
  return jsonFetch<WidgetConfig>(`${BASE}/widget-config`);
}

/**
 * Start a new chat conversation.
 */
export async function startConversation(
  message: string,
  visitorSessionId: string,
): Promise<{ conversation_id: string }> {
  return jsonFetch<{ conversation_id: string }>(`${BASE}/conversations`, {
    method: "POST",
    body: JSON.stringify({ message, visitor_session_id: visitorSessionId }),
  });
}

/**
 * Send a message to an existing conversation.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  idempotencyKey?: string,
): Promise<{ message_id: number }> {
  return jsonFetch<{ message_id: number }>(`${BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, idempotency_key: idempotencyKey }),
  });
}

/**
 * Fetch paginated messages for a conversation.
 */
export async function fetchMessages(
  conversationId: string,
  page = 1,
): Promise<{ data: Message[] }> {
  return jsonFetch<{ data: Message[] }>(
    `${BASE}/conversations/${conversationId}/messages?page=${page}`,
  );
}

export interface SSEConnection {
  close(): void;
}

/**
 * Connect to the SSE stream for real-time message updates.
 *
 * The server ends each stream after ~30 seconds with a `timeout` event. This
 * helper reconnects automatically with the newest message id, so no messages
 * are missed or replayed between connections.
 */
export function connectSSE(
  conversationId: string,
  lastId: number,
  onMessage: (msg: SSEMessage) => void,
  onError?: (err: Event) => void,
): SSEConnection {
  let currentLastId = Math.max(0, lastId);
  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const open = (): void => {
    if (closed) return;

    const params = new URLSearchParams({ last_id: String(currentLastId) });

    try {
      params.set("visitor_session_id", getVisitorSessionId());
    } catch {
      // Anonymous session header is optional for authenticated users.
    }

    source = new EventSource(`${BASE}/conversations/${conversationId}/stream?${params}`);

    const reconnect = (): void => {
      if (closed) return;

      source?.close();
      source = null;

      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(open, 1000);
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEMessage;

        if (typeof data.id === "number") {
          currentLastId = Math.max(currentLastId, data.id);
        }

        onMessage(data);
      } catch {
        // Skip invalid events.
      }
    };

    source.addEventListener("timeout", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { last_id?: number };

        if (typeof payload.last_id === "number") {
          currentLastId = Math.max(currentLastId, payload.last_id);
        }
      } catch {
        // No usable cursor; keep the last one we saw.
      }

      reconnect();
    });

    source.onerror = (err) => {
      onError?.(err);

      // EventSource retries connection errors itself, but a stream closed by
      // the server must be reopened explicitly.
      if (source?.readyState === EventSource.CLOSED) {
        reconnect();
      }
    };
  };

  open();

  return {
    close(): void {
      closed = true;

      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;

      source?.close();
      source = null;
    },
  };
}

/**
 * Escalate conversation to human support.
 */
export async function escalateConversation(conversationId: string, reason?: string): Promise<void> {
  await jsonFetch<{ message: string }>(`${BASE}/conversations/${conversationId}/escalate`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Leave contact details on the conversation so sales can follow up.
 */
export async function captureLead(
  conversationId: string,
  details: { name: string; phone?: string; email?: string; notes?: string },
): Promise<void> {
  await jsonFetch<{ message: string }>(`${BASE}/conversations/${conversationId}/lead`, {
    method: "POST",
    body: JSON.stringify(details),
  });
}

const CONVERSATION_KEY = "ai_support_conversation";

/**
 * The open conversation survives reloads within the tab, so a customer who
 * refreshes a product page keeps their thread (and the AI's reply to it).
 */
export function rememberConversation(conversationId: string | null): void {
  try {
    if (conversationId) sessionStorage.setItem(CONVERSATION_KEY, conversationId);
    else sessionStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // Storage blocked (private mode); the thread just won't survive a reload.
  }
}

export function recallConversation(): string | null {
  try {
    const value = sessionStorage.getItem(CONVERSATION_KEY);
    return value && /^[0-9a-z]{26}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Request a deterministic flooring estimate from the backend calculator.
 */
export interface CalculatorRoom {
  name?: string;
  shape: "rectangle" | "l_shape" | "custom";
  length?: number;
  width?: number;
  second_length?: number;
  second_width?: number;
  area?: number;
  deduction_area?: number;
}

export interface CalculatorResult {
  rooms: Array<{ name: string; shape: string; area_sqm: number; deduction_sqm: number }>;
  total_area_sqm: number;
  net_area_sqm: number;
  waste_percentage: number;
  area_with_waste_sqm: number;
  packs_required: number | null;
  estimated_cost: number | null;
  accessories: Array<{ key: string; label: string; quantity: number; unit: string }>;
  currency: string;
  disclaimer: string;
  product?: { id: number; name: string; slug: string; url: string } | null;
  variant?: { id: number; name: string; sku: string | null; price: number | null } | null;
}

export async function calculateFlooring(input: {
  rooms: CalculatorRoom[];
  unit?: "m" | "ft" | "sqm" | "sqft";
  product_id?: number;
  variant_id?: number;
  waste_percentage?: number;
}): Promise<CalculatorResult> {
  return jsonFetch<CalculatorResult>(`${BASE}/calculate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Generate or retrieve a visitor session ID (persisted in localStorage).
 */
let memoryVisitorId: string | null = null;

export function getVisitorSessionId(): string {
  const key = "ai_support_visitor_id";

  try {
    let id = localStorage.getItem(key);

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }

    return id;
  } catch {
    // Storage blocked: keep one id for this page view so the thread still works.
    memoryVisitorId ??= crypto.randomUUID();
    return memoryVisitorId;
  }
}
