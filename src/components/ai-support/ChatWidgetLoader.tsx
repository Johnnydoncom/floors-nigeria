"use client";

import dynamic from "next/dynamic";

/**
 * Loads the chat widget in the browser only, after hydration, so it adds
 * nothing to the storefront's server render or first-load bundle.
 *
 * `ssr: false` is only allowed inside a Client Component, hence this wrapper
 * rather than calling dynamic() from the (server) site layout.
 */
const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

export function ChatWidgetLoader() {
  return <ChatWidget />;
}
