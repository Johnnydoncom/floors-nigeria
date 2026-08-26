import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Archivo, Manrope, JetBrains_Mono } from "next/font/google";
import "../styles.css";
import { SiteHeader } from "@/components/site/header/SiteHeader";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { ScrollToTop } from "@/components/site/ScrollToTop";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
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
    <html lang="en" className={`${archivo.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
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
          <Suspense fallback={<div className="h-[72px] md:h-[116px]" aria-hidden />}>
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
