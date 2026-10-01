import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Montserrat, Nunito_Sans } from "next/font/google";
import "../styles.css";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/seo";

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
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SEO_KEYWORDS,
  authors: [{ name: "Floors Nigeria" }],
  creator: "Floors Nigeria",
  publisher: "Floors Nigeria",
  category: "Home improvement",
  alternates: { canonical: "/" },
  // Product codes and prices read as phone numbers to iOS Safari.
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_NG",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: "@FloorsNG",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121211",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${montserrat.variable} ${nunitoSans.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Floors NG" />
      </head>
      <body>
        <CartProvider>
          {/* 
            ScrollToTop reads the current URL, which is only known at request
            time. Suspending it keeps the rest of every page in the prerendered
            static shell. The header and footer are rendered by each
            route group's own layout, which suspends them for the same reason.
          */}
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>

          {children}

          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
