"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ruler, Download, Mail, Save, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const rate: Record<string, number> = {
  "Engineered Oak": 18500,
  "Metropolis SPC": 9800,
  "Savoy Marble": 34000,
  "Herringbone Elite": 26800,
};
const install = 3500;

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-2 h-12 w-full rounded-xl bg-background border border-border px-4 font-mono outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
      />
    </label>
  );
}

export default function Calculator() {
  const [length, setLength] = useState(6);
  const [width, setWidth] = useState(4);
  const [waste, setWaste] = useState(10);
  const [product, setProduct] = useState("Engineered Oak");
  const [rooms, setRooms] = useState(1);

  const area = length * width * rooms;
  const areaWithWaste = area * (1 + waste / 100);
  const material = Math.round(areaWithWaste * rate[product]);
  const installation = Math.round(area * install);
  const total = material + installation;

  const rows = useMemo(
    () => [
      ["Room area", `${area.toFixed(2)} m²`],
      ["Waste allowance", `+${waste}%`],
      ["Order quantity", `${areaWithWaste.toFixed(2)} m²`],
      ["Material rate", `₦${rate[product].toLocaleString()} /m²`],
      ["Material subtotal", `₦${material.toLocaleString()}`],
      [`Installation (₦${install.toLocaleString()}/m²)`, `₦${installation.toLocaleString()}`],
    ],
    [area, waste, areaWithWaste, product, material, installation],
  );

  return (
    <>
      <section className="pt-32 md:pt-40 container-fluid">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">Studio</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight max-w-3xl text-balance">
            Precise budgets. Zero guesswork.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Configure your space, choose a product, and generate a fully-costed BOQ with
            installation.
          </p>
        </Reveal>
      </section>

      <section className="container-fluid pt-14 pb-24 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-border bg-surface p-8 md:p-10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 grid place-items-center rounded-2xl bg-background border border-border text-gold">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl">Configure your project</div>
                <div className="text-sm text-muted-foreground">
                  Rectangular room · imperial coming soon
                </div>
              </div>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-5">
              <Field label="Length (m)" value={length} onChange={setLength} />
              <Field label="Width (m)" value={width} onChange={setWidth} />
              <Field label="Number of rooms" value={rooms} onChange={setRooms} />
              <Field label="Waste allowance (%)" value={waste} onChange={setWaste} />
            </div>

            <div className="mt-6">
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Product
              </label>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {Object.keys(rate).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProduct(p)}
                    className={`h-12 rounded-xl border text-sm font-medium transition ${product === p ? "bg-charcoal text-primary-foreground border-charcoal" : "border-border hover:border-foreground/40"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-3xl bg-charcoal-dark text-primary-foreground p-8 md:p-10 shadow-elevated">
            <div className="font-mono text-[11px] uppercase tracking-widest text-gold-light">
              Live estimate
            </div>
            <div className="mt-3 font-display text-5xl tracking-tight">
              ₦{total.toLocaleString()}
            </div>
            <div className="text-primary-foreground/60 text-sm mt-1">
              Excludes VAT · Valid 14 days
            </div>

            <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 py-3 text-sm">
                  <dt className="text-primary-foreground/70">{k}</dt>
                  <dd className="font-mono text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 grid gap-2">
              <Link
                href="/contact"
                className="h-12 inline-flex items-center justify-center gap-2 rounded-full bg-white text-charcoal-dark text-sm font-medium hover:bg-gold-light transition"
              >
                Send me a formal quote <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="grid grid-cols-3 gap-2">
                <button className="h-11 rounded-full border border-white/25 text-xs inline-flex items-center justify-center gap-1.5 hover:bg-white/10">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
                <button className="h-11 rounded-full border border-white/25 text-xs inline-flex items-center justify-center gap-1.5 hover:bg-white/10">
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
                <button className="h-11 rounded-full border border-white/25 text-xs inline-flex items-center justify-center gap-1.5 hover:bg-white/10">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
