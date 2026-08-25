import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal",
  description: "Craft, specification and design notes from Nigeria's premium flooring house.",
};

const posts = [
  { title: "Specifying oak for Lagos humidity: a definitive guide", cat: "Craft", date: "12 Jul 2026", read: "8 min", img: "/images/project-hotel.jpg", feature: true },
  { title: "The return of book-matched marble", cat: "Materials", date: "04 Jul 2026", read: "6 min", img: "/images/collection-stone.jpg" },
  { title: "Why SPC is winning the contract market", cat: "Trends", date: "28 Jun 2026", read: "5 min", img: "/images/project-office.jpg" },
  { title: "Inside a Banana Island commission", cat: "Projects", date: "19 Jun 2026", read: "10 min", img: "/images/project-residence.jpg" },
  { title: "AI in the flooring specification workflow", cat: "Studio", date: "10 Jun 2026", read: "7 min", img: "/images/ai-visualizer.jpg" },
];

export default function Blog() {
  const [feat, ...rest] = posts;
  return (
    <>
      <section className="pt-32 md:pt-40 container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Journal</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-3xl text-balance">
            Notes on craft, specification and design.
          </h1>
        </Reveal>
      </section>

      <section className="container-fluid pt-12 pb-24">
        <Reveal>
          <Link href="/blog" className="group grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 relative aspect-[16/10] rounded-3xl overflow-hidden bg-muted">
              <img src={feat.img} alt={feat.title} className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
            </div>
            <div className="lg:col-span-5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-gold">{feat.cat} · Featured</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl tracking-tight group-hover:text-gold transition">{feat.title}</h2>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{feat.date}</span><span>·</span><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {feat.read}</span>
              </div>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium">Read article <ArrowUpRight className="h-4 w-4" /></div>
            </div>
          </Link>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rest.map((p, i) => (
            <Reveal key={p.title} delay={(i % 4) * 0.05}>
              <Link href="/blog" className="group block">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted">
                  <img src={p.img} alt={p.title} className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                </div>
                <div className="pt-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{p.cat}</div>
                  <h3 className="mt-1 font-display text-xl tracking-tight group-hover:text-gold transition">{p.title}</h3>
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">{p.date} · <Clock className="h-3 w-3" /> {p.read}</div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
