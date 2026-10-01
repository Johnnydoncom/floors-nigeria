import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header/SiteHeader";
import { Footer } from "@/components/site/Footer";

/**
 * Account pages are personal: kept out of search results, and printable
 * without the site's navigation (a quote is often printed for whoever pays).
 */
export const metadata: Metadata = {
  title: { default: "Your account", template: "%s — Floors NG" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <Suspense fallback={<div className="h-header" aria-hidden />}>
          <SiteHeader />
        </Suspense>
      </div>
      <main id="main" className="min-h-screen">
        {children}
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}
