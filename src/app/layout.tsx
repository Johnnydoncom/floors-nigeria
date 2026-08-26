import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Montserrat, Nunito_Sans } from "next/font/google";
import "../styles.css";
import { SiteHeader } from "@/components/site/header/SiteHeader";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { ScrollToTop } from "@/components/site/ScrollToTop";

/**
 * Montserrat carries headings, navigation and the small uppercase labels —
 * geometric and confident without being decorative. Nunito Sans handles body
 * copy: open counters and a tall x-height keep long specification text
 * comfortable on the small screens most Nigerian visitors arrive on.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  // Resolves every relative canonical and Open Graph URL to an absolute one.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Floors NG — Premium Flooring Solutions in Nigeria",
    template: "%s — Floors NG",
  },
  description:
    "Nigeria's premium flooring house. Engineered wood, SPC, luxury vinyl, natural stone and wall panels for residential and commercial spaces.",
  authors: [{ name: "Floors Nigeria" }],
  openGraph: {
    title: "Floors NG — Premium Flooring Solutions in Nigeria",
    description:
      "Engineered surfaces, natural stone and architectural finishes for Nigeria's most demanding spaces.",
    type: "website",
    siteName: "Floors NG",
  },
  twitter: {
    card: "summary_large_image",
    site: "@FloorsNG",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#56554D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${nunitoSans.variable}`}>
      <body>
        <CartProvider>
          {/*
            Header and ScrollToTop read the current URL, which is only known at
            request time. Suspending them keeps the rest of every page in the
            prerendered static shell (§19, §28).
          */}
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <Suspense fallback={<div className="h-header" aria-hidden />}>
            <SiteHeader />
          </Suspense>
          <main id="main" className="min-h-screen">
            {children}
          </main>
          <Footer />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
