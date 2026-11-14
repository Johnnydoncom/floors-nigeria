// AI Support module types — shared across widget and admin.

export interface Conversation {
  id: number;
  ulid: string;
  channel: "website" | "instagram" | "whatsapp";
  status: "open" | "waiting" | "assigned" | "resolved" | "closed";
  ai_mode: "active" | "paused_human_takeover" | "paused_escalated" | "off";
  priority: "low" | "normal" | "high" | "urgent";
  user_id: number | null;
  assigned_agent_id: number | null;
  lead_id?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  last_inbound_at?: string | null;
  /** False once WhatsApp's 24-hour reply window has closed. */
  can_reply?: boolean;
  visitor_session_id: string | null;
  message_count: number;
  first_response_at: string | null;
  last_message_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: number; name: string; email?: string } | null;
  assignedAgent?: { id: number; name: string } | null;
  assigned_agent?: { id: number; name: string } | null;
  lead?: { id: number; name: string; status: string } | null;
  messages?: Message[];
}

export interface Message {
  id: number;
  conversation_id: number;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "ai" | "agent" | "system";
  content: string;
  content_type: "text" | "voice" | "product_card" | "calculation" | "image";
  is_internal_note: boolean;
  delivery_status: "pending" | "sent" | "delivered" | "read" | "failed";
  metadata?: {
    delivery_error?: string;
    voice?: boolean;
    transcribed?: boolean;
    transcription_failed?: boolean;
  } | null;
  created_at: string;
}

export interface WidgetConfig {
  enabled: boolean;
  greeting: string;
  position: "bottom-right" | "bottom-left";
  theme: "light" | "dark";
  theme_color: string;
  offline_message: string;
  lead_capture?: boolean;
  human_support?: boolean;
  /** "Continue on WhatsApp" link, present only while the WhatsApp agent is live. */
  whatsapp_url?: string | null;
  /** Microphone button: voice notes are on and a speech provider is configured. */
  voice_input?: boolean;
}

export interface SSEMessage {
  id: number;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "ai" | "agent" | "system";
  content: string;
  content_type: string;
  created_at: string;
}

export interface AnalyticsData {
  total_conversations: number;
  conversations_by_channel: Record<string, number>;
  conversations_by_status: Record<string, number>;
  avg_first_response_seconds: number;
  escalation_count: number;
  total_ai_cost: number;
  conversations_today: number;
  messages_today: number;
}

export interface KnowledgeSource {
  id: number;
  title: string;
  type: string;
  status: "draft" | "pending_review" | "approved" | "expired";
  ingestion_status: "pending" | "processing" | "indexed" | "failed" | "stale";
  owner_id: number;
  source_reference: string | null;
  ingested_at: string | null;
  created_at: string;
  updated_at: string;
  owner?: { id: number; name: string } | null;
  chunks_count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
  total: number;
}
