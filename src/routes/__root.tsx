import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";

function NotFoundComponent() {
  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center px-6 pt-32 pb-24">
        <div className="text-center max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Error 404</p>
          <h1 className="mt-6 font-display text-6xl md:text-8xl tracking-tight">Lost the plan.</h1>
          <p className="mt-4 text-muted-foreground">
            The page you're looking for has been moved, renamed, or never existed.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/" className="h-11 inline-flex items-center rounded-full bg-charcoal px-6 text-sm font-medium text-primary-foreground hover:bg-charcoal-dark transition">Go home</Link>
            <Link to="/products" className="h-11 inline-flex items-center rounded-full border border-border px-6 text-sm font-medium hover:bg-muted transition">Browse products</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again, or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="h-11 inline-flex items-center rounded-full bg-charcoal px-6 text-sm font-medium text-primary-foreground hover:bg-charcoal-dark transition"
          >
            Try again
          </button>
          <a href="/" className="h-11 inline-flex items-center rounded-full border border-border px-6 text-sm font-medium hover:bg-muted transition">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Floors NG — Premium Flooring Solutions in Nigeria" },
      { name: "description", content: "Nigeria's premium flooring house. Engineered wood, SPC, luxury vinyl, natural stone and wall panels for residential and commercial spaces." },
      { name: "author", content: "Floors Nigeria" },
      { name: "theme-color", content: "#56554D" },
      { property: "og:title", content: "Floors NG — Premium Flooring Solutions in Nigeria" },
      { property: "og:description", content: "Engineered surfaces, natural stone and architectural finishes for Nigeria's most demanding spaces." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@FloorsNG" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Header />
        <main id="main" className="min-h-screen">
          <Outlet />
        </main>
        <Footer />
        <Toaster />
      </CartProvider>
    </QueryClientProvider>
  );
}
