import Link from "next/link";
import { MapPin, MessageCircle, Phone, Ruler, Truck } from "lucide-react";
import { getNavigation } from "@/lib/api/navigation";
import { whatsAppLink } from "@/lib/format";
import { SHOWROOM_PHONE, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { HeaderBar } from "./HeaderBar";
import { UtilityBar } from "./UtilityBar";

/**
 * The site header (§32).
 *
 * A flooring business sells on trust and material, so the chrome leads with
 * where we are, how to reach a consultant, and the materials themselves — the
 * navigation is built from the live catalogue rather than a hardcoded list.
 *
 * Server Component: the navigation is fetched and cached here, and only the
 * interactive shell below it ships JavaScript.
 */
const UTILITY_LINKS = [
  { label: "Floor Calculator", href: "/calculator" },
  { label: "Installation", href: "/industries" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

// No backdrop-filter on the header: it would make the header the containing
// block for its `position: fixed` children, trapping the mobile menu and the
// search overlay inside the header's own box.
export async function SiteHeader() {
  const navigation = await getNavigation();

  return (
    <header className="sticky inset-x-0 top-0 z-50 bg-background shadow-[0_1px_0_0_var(--border)]">
      <UtilityBar>
        <div className="container-fluid flex h-9 items-center justify-between font-display text-[11px] font-medium tracking-[0.04em]">
          <div className="flex items-center gap-6 text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gold-light" aria-hidden />
              Lekki · Ikeja · Abuja
            </span>
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              <Ruler className="h-3 w-3 text-gold-light" aria-hidden />
              Free site survey in Lagos
            </span>
            <span className="hidden items-center gap-1.5 xl:inline-flex">
              <Truck className="h-3 w-3 text-gold-light" aria-hidden />
              Nationwide delivery &amp; installation
            </span>
          </div>

          <div className="flex items-center gap-5 text-primary-foreground/70">
            <a
              href={`tel:${SHOWROOM_PHONE}`}
              className="inline-flex items-center gap-1.5 transition hover:text-gold-light"
            >
              <Phone className="h-3 w-3 text-gold-light" aria-hidden />
              {SHOWROOM_PHONE}
            </a>
            <a
              href={whatsAppLink(
                WHATSAPP_NUMBER,
                "Hello Floor Nigeria, I would like a flooring quote.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-gold-light"
            >
              <MessageCircle className="h-3 w-3 text-gold-light" aria-hidden />
              WhatsApp
            </a>
            {/* Tools and company pages; the main bar is reserved for floors. */}
            <span className="hidden h-3 w-px bg-white/20 lg:block" aria-hidden />
            {UTILITY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hidden transition hover:text-gold-light lg:inline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </UtilityBar>

      <HeaderBar navigation={navigation} />
    </header>
  );
}
