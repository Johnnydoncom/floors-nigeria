/**
 * Product analytics events (§33).
 *
 * One typed entry point, so an event's name and properties are the same
 * wherever it is fired. Events go to whichever tag manager the deployment has
 * loaded — Google Tag Manager's `dataLayer`, or `gtag` directly — and are also
 * dispatched as a DOM event, so another tool can listen without code changes.
 * With nothing loaded they go nowhere: tracking never breaks a page.
 */

export type AnalyticsEvent =
  | "visualizer_opened"
  | "room_selected"
  | "floor_detected"
  | "floor_detection_failed"
  | "floor_area_edited"
  | "product_selected"
  | "visualization_completed"
  | "layout_changed"
  | "comparison_used"
  | "favorite_saved"
  | "design_saved"
  | "design_shared"
  | "image_downloaded"
  | "lead_submitted"
  | "cta_clicked"
  | "ar_launched"
  | "qr_shown";

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type TagWindow = Window & {
  dataLayer?: Record<string, unknown>[];
  gtag?: (command: "event", name: string, properties?: AnalyticsProperties) => void;
};

export const ANALYTICS_DOM_EVENT = "floorsng:analytics";

export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  if (typeof window === "undefined") return;

  const target = window as TagWindow;

  try {
    if (Array.isArray(target.dataLayer)) {
      target.dataLayer.push({ event, ...properties });
    } else if (typeof target.gtag === "function") {
      target.gtag("event", event, properties);
    }

    window.dispatchEvent(new CustomEvent(ANALYTICS_DOM_EVENT, { detail: { event, properties } }));
  } catch {
    // Analytics must never be the reason a button stops working.
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, properties);
  }
}
