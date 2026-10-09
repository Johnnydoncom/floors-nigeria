import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Workspace", template: "%s · Workspace" },
  robots: { index: false, follow: false },
};

/**
 * `/admin` holds the staff workspace (`(workspace)`, inside the shell) and
 * its own sign-in page (`login`, outside it).
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
