"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ruler, Download, Mail, Save, ArrowRight } from "lucide-react";

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
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-2 h-12 w-full rounded-md border border-border bg-background px-4 font-mono outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10"
      />
    </label>
  );
}

/**
 * The live estimate. A client island: every keystroke reprices the room, so
 * it needs state, while the page around it stays server-rendered.
 */
export function FloorCalculator() {
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
    <section className="container-fluid grid gap-6 pb-20 pt-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="rounded-xl border border-border bg-surface p-6 md:p-10">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-gold">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl">Configure your project</h2>
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Product
            </p>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {Object.keys(rate).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={product === p}
                  onClick={() => setProduct(p)}
                  className={`h-12 rounded-md border text-sm font-medium transition ${product === p ? "bg-charcoal text-primary-foreground border-charcoal" : "border-border hover:border-foreground/40"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="sticky top-24 rounded-xl bg-charcoal-dark p-6 text-primary-foreground shadow-elevated md:p-10">
          <h2 className="eyebrow text-gold-light">Live estimate</h2>
          <div className="mt-3 font-display text-5xl tracking-tight">₦{total.toLocaleString()}</div>
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
            <Link href="/contact" className="btn btn-gold">
              Send me a formal quote <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="h-11 rounded-md border border-white/25 text-xs inline-flex items-center justify-center gap-1.5 hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                type="button"
                className="h-11 rounded-md border border-white/25 text-xs inline-flex items-center justify-center gap-1.5 hover:bg-white/10"
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button
                type="button"
                className="h-11 rounded-md border border-white/25 text-xs inline-flex items-center justify-center gap-1.5 hover:bg-white/10"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
