import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/catalog/WhatsAppIcon";
import { formatPhone } from "@/lib/branches";
import { whatsAppLink } from "@/lib/format";
import { SHOWROOM_PHONE, WHATSAPP_NUMBER } from "@/lib/site-contact";

/** The two ways to start: a site survey for a home, an account for the trade. */
export function ClosingCta() {
  return (
    <section aria-labelledby="home-start" className="container-fluid pb-12 md:pb-24">
      <div className="grid grid-cols-1 overflow-hidden rounded-xl lg:grid-cols-12">
        <div className="relative isolate overflow-hidden bg-charcoal-dark p-8 text-primary-foreground md:p-12 lg:col-span-7">
          <Image
            src="/images/home/closing-residence-1280.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="-z-10 object-cover opacity-35"
          />
          <h2
            id="home-start"
            className="max-w-lg text-balance font-display text-[1.9rem] leading-[1.1] tracking-[-0.02em] md:text-[2.4rem]"
          >
            Ready when you are. Book a free site survey.
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-primary-foreground/80">
            We measure, check your subfloor and send a written quotation for materials, delivery and
            installation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact?enquiry=survey" className="btn btn-gold">
              Book a site survey <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={whatsAppLink(
                WHATSAPP_NUMBER,
                "Hello Floor Nigeria, I would like a flooring quote.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-light"
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp us
            </a>
          </div>
          <a
            href={`tel:${SHOWROOM_PHONE}`}
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary-foreground/75 hover:text-primary-foreground"
          >
            <Phone className="h-4 w-4" aria-hidden /> Or call {formatPhone(SHOWROOM_PHONE)}
          </a>
        </div>

        <div className="flex flex-col justify-between gap-8 bg-surface p-8 md:p-12 lg:col-span-5">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight">
              Architects, contractors and developers
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Open a trade account for project pricing, free sample boxes, BIM files and a dedicated
              account manager.
            </p>
          </div>
          <div>
            <Link href="/contact?enquiry=trade" className="btn btn-primary">
              Open a trade account
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Buying for your own home? Samples are ₦2,500 each, refunded against your first order
              above 50 m².{" "}
              <Link
                href="/contact?enquiry=samples"
                className="font-semibold text-foreground underline underline-offset-4"
              >
                Order samples
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
