import { Suspense } from "react";
import { SiteHeader } from "@/components/site/header/SiteHeader";
import { Footer } from "@/components/site/Footer";
import { ChatWidgetLoader } from "@/components/ai-support/ChatWidgetLoader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-header" aria-hidden />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="min-h-screen">
        {children}
      </main>
      <Footer />
      <ChatWidgetLoader />
    </>
  );
}
