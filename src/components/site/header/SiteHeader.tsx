import Link from "next/link";
import { MapPin, MessageCircle, Phone, Ruler } from "lucide-react";
import { getNavigation } from "@/lib/api/navigation";
import { whatsAppLink } from "@/lib/format";
import { HeaderBar } from "./HeaderBar";

const SHOWROOM_PHONE = "+2348000000000";

/**
 * The site header (§32).
 *
 * A flooring business sells on trust and material, so the chrome leads with
 * where we are, how to reach a consultant, and the materials themselves —
 * the navigation is built from the live catalogue rather than a hardcoded list.
 *
 * Server Component: the nav data is fetched and cached here, and only the
 * interactive shell below it ships JavaScript.
 */
export async function SiteHeader() {
  const navigation = await getNavigation();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background shadow-[0_1px_0_0_var(--border)]">
      <div className="hidden bg-charcoal-dark text-primary-foreground md:block">
        <div className="container-fluid flex h-9 items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
          <div className="flex items-center gap-6 text-primary-foreground/75">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gold-light" aria-hidden />
              Showrooms: Lekki · Ikeja · Abuja
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-3 w-3 text-gold-light" aria-hidden />
              Free site survey across Lagos
            </span>
          </div>

          <div className="flex items-center gap-5 text-primary-foreground/75">
            <a
              href={`tel:${SHOWROOM_PHONE}`}
              className="inline-flex items-center gap-1.5 transition hover:text-gold-light"
            >
              <Phone className="h-3 w-3 text-gold-light" aria-hidden />
              {SHOWROOM_PHONE}
            </a>
            <a
              href={whatsAppLink(
                SHOWROOM_PHONE,
                "Hello Floor Nigeria, I would like a flooring quote.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-gold-light"
            >
              <MessageCircle className="h-3 w-3 text-gold-light" aria-hidden />
              WhatsApp
            </a>
            <Link href="/calculator" className="transition hover:text-gold-light">
              Floor Calculator
            </Link>
            <Link href="/account" className="transition hover:text-gold-light">
              My Account
            </Link>
          </div>
        </div>
      </div>

      <HeaderBar navigation={navigation} />
    </header>
  );
}
