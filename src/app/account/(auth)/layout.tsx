import { FileText, Heart, MapPin, Truck } from "lucide-react";

const BENEFITS = [
  { icon: FileText, text: "Follow every quote from request to approval" },
  { icon: Truck, text: "Track site surveys, deliveries and installation" },
  { icon: Heart, text: "Keep a shortlist of products and room visualisations" },
  { icon: MapPin, text: "Save the sites you deliver to" },
];

/**
 * Sign-in, registration and password recovery share one frame: the form, and
 * a reminder of what an account is for.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-header">
      <div className="container-fluid grid items-start gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-20 lg:py-24">
        <aside className="hidden lg:block">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
            Your Floors NG account
          </p>
          <p className="mt-4 max-w-md text-balance font-display text-4xl tracking-tight">
            Every floor you&apos;re planning, in one place.
          </p>
          <ul className="mt-10 space-y-5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-muted-foreground">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-surface text-gold">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
