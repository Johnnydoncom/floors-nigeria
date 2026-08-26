import "server-only";
import { api, ApiError } from "./client";
import type { Envelope, ProductCard, Variant } from "./types";

export type SavedVisualization = {
  id: number;
  share_token: string;
  surface_type: string;
  result_url: string | null;
  source_url: string | null;
  settings: Record<string, unknown>;
  created_at: string | null;
  variant?: Variant;
  product?: ProductCard;
};

/**
 * A shared visualization. Never cached: the link is a capability, and a stale
 * copy of someone's room is worse than a round trip.
 */
export async function getVisualization(shareToken: string): Promise<SavedVisualization | null> {
  try {
    const { data } = await api.get<Envelope<SavedVisualization>>(
      `/v1/visualizations/${shareToken}`,
    );
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
