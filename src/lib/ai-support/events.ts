/**
 * Opens the AI chat widget from anywhere on the site, optionally asking a
 * first question: `openChat("Which of these suits a kitchen?")`.
 */
export const OPEN_CHAT_EVENT = "floorsng:open-chat";

export function openChat(message?: string): void {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { message } }));
}
