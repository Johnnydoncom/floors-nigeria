"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Package,
  Heart,
  FileText,
  MapPin,
  Settings,
  LogOut,
  Sparkles,
  Truck,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { PRODUCTS } from "@/lib/catalog";
import { naira } from "@/lib/format";

const TABS = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "orders", label: "Orders", icon: Truck },
  { id: "saved", label: "Saved", icon: Heart },
  { id: "quotes", label: "Quotes", icon: FileText },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "settings", label: "Settings", icon: Settings },
];

const orders = [
  {
    id: "FN-284193",
    date: "12 Jul 2026",
    items: "Engineered Oak Classic · 120 m²",
    total: 2220000,
    status: "In transit",
  },
  {
    id: "FN-283044",
    date: "28 Jun 2026",
    items: "Metropolis SPC · 340 m²",
    total: 3332000,
    status: "Installed",
  },
  {
    id: "FN-281900",
    date: "03 Jun 2026",
    items: "Savoy Marble · 46 m²",
    total: 1564000,
    status: "Installed",
  },
  { id: "FN-280677", date: "19 May 2026", items: "Samples × 4", total: 10000, status: "Delivered" },
];

const statusTone: Record<string, string> = {
  "In transit": "bg-gold/15 text-gold",
  Installed: "bg-emerald-500/12 text-emerald-700",
  Delivered: "bg-muted text-muted-foreground",
};

export default function Account() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="pt-[104px] md:pt-[148px] pb-24">
      <div className="bg-charcoal-dark text-primary-foreground">
        <div className="container-fluid py-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-14 w-14 shrink-0 grid place-items-center bg-gold text-charcoal-dark font-display text-xl">
              AO
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl md:text-3xl tracking-tight">
                Welcome back, Adaeze
              </h1>
              <p className="text-sm text-primary-foreground/60">
                Trade account · Lagos · Member since 2023
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="h-11 shrink-0 inline-flex items-center px-5 bg-gold text-charcoal-dark text-xs font-semibold uppercase tracking-[0.08em] hover:bg-primary-foreground transition"
          >
            Start a new order
          </Link>
        </div>
      </div>

      <div className="container-fluid grid lg:grid-cols-12 gap-8 pt-10">
        <aside className="lg:col-span-3">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto border border-border p-2 bg-surface">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 whitespace-nowrap px-4 h-11 text-sm transition ${
                  tab === t.id ? "bg-charcoal-dark text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
            <button className="flex items-center gap-3 px-4 h-11 text-sm text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </aside>

        <section className="lg:col-span-9 space-y-8">
          {tab === "overview" && (
            <>
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  ["4", "Orders placed"],
                  ["₦7.1M", "Lifetime spend"],
                  ["506 m²", "Floor installed"],
                ].map(([n, l]) => (
                  <div key={l} className="border border-border p-6">
                    <div className="font-display text-3xl">{n}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {l}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-border">
                <div className="flex items-center justify-between border-b border-border p-5">
                  <h2 className="font-display text-xl">Active order</h2>
                  <span className="font-mono text-xs text-muted-foreground">FN-284193</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm">
                    {["Confirmed", "Dispatched", "In transit", "Installed"].map((s, i) => (
                      <div key={s} className="flex-1">
                        <div className={`h-1.5 ${i <= 2 ? "bg-gold" : "bg-border"}`} />
                        <div
                          className={`mt-2 text-[11px] ${i <= 2 ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {s}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground">
                    Engineered Oak Classic · 120 m² · arriving Banana Island on 2 Aug 2026 between
                    9am–1pm.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Link
                  href="/visualizer"
                  className="group border border-border p-6 hover:border-gold transition"
                >
                  <Sparkles className="h-5 w-5 text-gold" />
                  <div className="mt-4 font-display text-xl">Visualise your next room</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload a photo and preview any product in seconds.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium group-hover:text-gold">
                    Open AI Studio <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link
                  href="/calculator"
                  className="group border border-border p-6 hover:border-gold transition"
                >
                  <FileText className="h-5 w-5 text-gold" />
                  <div className="mt-4 font-display text-xl">Estimate a new area</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate a BOQ with wastage and installation cost.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium group-hover:text-gold">
                    Open calculator <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </>
          )}

          {tab === "orders" && (
            <div className="border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    {["Order", "Date", "Items", "Total", "Status", ""].map((h) => (
                      <th key={h} className="px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-5 py-4 font-mono">{o.id}</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.date}</td>
                      <td className="px-5 py-4">{o.items}</td>
                      <td className="px-5 py-4 font-mono">{naira(o.total)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-[11px] ${statusTone[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="inline-flex items-center gap-1 text-xs hover:text-gold">
                          <Download className="h-3.5 w-3.5" /> Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "saved" && (
            <div className="grid sm:grid-cols-3 gap-5">
              {PRODUCTS.slice(0, 6).map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  className="group border border-border hover:border-gold transition"
                >
                  <img src={p.img} alt={p.name} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-4">
                    <div className="font-display text-lg truncate">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {naira(p.price)}/m²
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === "quotes" && (
            <div className="border border-border divide-y divide-border">
              {[
                [
                  "QT-10422",
                  "Ikoyi duplex · 310 m² engineered oak",
                  "₦6,142,000",
                  "Awaiting approval",
                ],
                ["QT-10388", "Lekki clinic · 640 m² SPC", "₦7,180,000", "Approved"],
              ].map(([id, desc, amt, status]) => (
                <div key={id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{id}</div>
                    <div className="font-medium">{desc}</div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="font-mono">{amt}</span>
                    <span className="text-xs px-2.5 py-1 bg-muted">{status}</span>
                    <button className="text-xs hover:text-gold inline-flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "addresses" && (
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                ["Home", "14 Ocean Parade, Banana Island, Ikoyi, Lagos"],
                ["Site office", "Plot 22 Admiralty Way, Lekki Phase 1, Lagos"],
              ].map(([label, addr]) => (
                <div key={label} className="border border-border p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                    {label}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{addr}</p>
                  <div className="mt-5 flex gap-3 text-xs">
                    <button className="hover:text-gold">Edit</button>
                    <button className="text-muted-foreground hover:text-destructive">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "settings" && (
            <div className="border border-border p-6 grid sm:grid-cols-2 gap-4 max-w-2xl">
              {["Full name", "Email address", "Phone number", "Company"].map((f) => (
                <label key={f} className="text-sm">
                  <span className="text-muted-foreground text-xs">{f}</span>
                  <input
                    className="mt-1 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-gold"
                    placeholder={f}
                  />
                </label>
              ))}
              <button className="sm:col-span-2 h-12 bg-charcoal-dark text-primary-foreground text-sm font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition">
                Save changes
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
