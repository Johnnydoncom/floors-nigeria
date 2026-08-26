"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  TrendingUp,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { PRODUCTS } from "@/lib/catalog";
import { naira } from "@/lib/format";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "catalogue", label: "Catalogue", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const kpis = [
  ["₦412.6M", "Revenue YTD", "+18.4%"],
  ["286", "Open orders", "+12"],
  ["94.8%", "On-time delivery", "+1.2pt"],
  ["₦1.44M", "Avg. order value", "+6.1%"],
];

const bars = [42, 55, 38, 71, 64, 88, 76, 95, 82, 68, 91, 100];

const recent = [
  ["FN-284193", "Adaeze Okoro", "Engineered Oak Classic", 2220000, "Processing"],
  ["FN-284188", "Lagoon Hotels Ltd", "Metropolis SPC", 8940000, "Awaiting payment"],
  ["FN-284171", "Kunle Bakare", "Savoy Marble", 1564000, "Dispatched"],
  ["FN-284150", "Rivers State Clinic", "Urban Luxury Vinyl", 4380000, "Installed"],
] as const;

export default function Admin() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="pt-header min-h-screen bg-surface">
      <div className="container-fluid grid lg:grid-cols-[220px_minmax(0,1fr)] gap-8 py-10">
        <aside>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
            Operations
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex items-center gap-3 whitespace-nowrap px-4 h-11 text-sm transition ${
                  tab === n.id ? "bg-charcoal-dark text-primary-foreground" : "hover:bg-background"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </button>
            ))}
          </nav>
          <div className="mt-6 border border-gold/40 bg-gold/10 p-4">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <p className="mt-2 text-xs text-muted-foreground">
              3 SKUs below reorder point in the Lagos warehouse.
            </p>
          </div>
        </aside>

        <main className="space-y-8">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl tracking-tight">Admin dashboard</h1>
              <p className="text-sm text-muted-foreground">Live snapshot · updated 4 minutes ago</p>
            </div>
            <button className="shrink-0 h-11 px-5 inline-flex items-center gap-2 bg-charcoal-dark text-primary-foreground text-xs font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition">
              <Plus className="h-4 w-4" /> New product
            </button>
          </header>

          {tab === "overview" && (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {kpis.map(([v, l, d]) => (
                  <div key={l} className="bg-background border border-border p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {l}
                    </div>
                    <div className="mt-3 font-display text-3xl">{v}</div>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
                      <TrendingUp className="h-3.5 w-3.5" /> {d}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-background border border-border p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl">Revenue by month</h2>
                    <span className="font-mono text-xs text-muted-foreground">2026</span>
                  </div>
                  <div className="mt-8 flex h-48 items-end gap-2">
                    {bars.map((b, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-charcoal-dark/85 hover:bg-gold transition-colors"
                        style={{ height: `${b}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {["Jan", "Apr", "Jul", "Oct", "Dec"].map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-background border border-border p-6">
                  <h2 className="font-display text-xl">Top materials</h2>
                  <div className="mt-6 space-y-4">
                    {[
                      ["Engineered wood", 46],
                      ["SPC & vinyl", 31],
                      ["Natural stone", 14],
                      ["Wall panels", 9],
                    ].map(([label, pct]) => (
                      <div key={label as string}>
                        <div className="flex justify-between text-xs">
                          <span>{label}</span>
                          <span className="font-mono text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-muted">
                          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border overflow-x-auto">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <h2 className="font-display text-xl">Recent orders</h2>
                  <button onClick={() => setTab("orders")} className="text-xs hover:text-gold">
                    View all →
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <tr>
                      {["Order", "Customer", "Product", "Value", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r[0]} className="border-t border-border">
                        <td className="px-5 py-4 font-mono">{r[0]}</td>
                        <td className="px-5 py-4">{r[1]}</td>
                        <td className="px-5 py-4 text-muted-foreground">{r[2]}</td>
                        <td className="px-5 py-4 font-mono">{naira(r[3])}</td>
                        <td className="px-5 py-4">
                          <span className="bg-muted px-2.5 py-1 text-[11px]">{r[4]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "orders" && (
            <div className="bg-background border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    {["Order", "Customer", "Product", "Value", "Status", ""].map((h) => (
                      <th key={h} className="px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...recent, ...recent].map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-5 py-4 font-mono">{r[0]}</td>
                      <td className="px-5 py-4">{r[1]}</td>
                      <td className="px-5 py-4 text-muted-foreground">{r[2]}</td>
                      <td className="px-5 py-4 font-mono">{naira(r[3])}</td>
                      <td className="px-5 py-4">
                        <span className="bg-muted px-2.5 py-1 text-[11px]">{r[4]}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="text-xs hover:text-gold">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "catalogue" && (
            <div className="bg-background border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    {["Product", "Category", "Price /m²", "Stock", ""].map((h) => (
                      <th key={h} className="px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRODUCTS.map((p, i) => {
                    const stock = [1240, 90, 3400, 210, 40, 780, 1500, 2600, 320][i % 9];
                    return (
                      <tr key={p.slug} className="border-t border-border">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={p.img} alt="" className="h-10 w-10 object-cover" />
                            <Link href={`/products/${p.slug}`} className="hover:text-gold">
                              {p.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                        <td className="px-5 py-3 font-mono">{naira(p.price)}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`font-mono text-xs ${stock < 200 ? "text-destructive" : ""}`}
                          >
                            {stock} m²
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button className="text-xs hover:text-gold">Edit</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "customers" && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[
                ["Adaeze Okoro", "Retail · Lagos", "₦7.1M"],
                ["Lagoon Hotels Ltd", "Hospitality · Lagos", "₦48.3M"],
                ["Rivers State Clinic", "Healthcare · PH", "₦12.9M"],
                ["Kunle Bakare", "Retail · Abuja", "₦3.4M"],
                ["Access Facilities", "Commercial · Lagos", "₦96.2M"],
                ["Bricklane Studio", "Trade · Abuja", "₦21.7M"],
              ].map(([n, m, v]) => (
                <div key={n} className="bg-background border border-border p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 grid place-items-center bg-charcoal-dark text-primary-foreground font-mono text-xs">
                      {n
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{n}</div>
                      <div className="text-xs text-muted-foreground">{m}</div>
                    </div>
                  </div>
                  <div className="mt-4 font-mono text-lg">{v}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Lifetime value
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "reports" && (
            <div className="grid md:grid-cols-2 gap-5">
              {[
                "Sales by region",
                "Installation SLA",
                "Inventory turnover",
                "Quote conversion",
              ].map((r) => (
                <div key={r} className="bg-background border border-border p-6">
                  <h2 className="font-display text-xl">{r}</h2>
                  <div className="mt-6 flex h-32 items-end gap-1.5">
                    {bars.slice(0, 9).map((b, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gold/70"
                        style={{ height: `${(b + i * 2) % 100}%` }}
                      />
                    ))}
                  </div>
                  <button className="mt-5 text-xs hover:text-gold">Export CSV →</button>
                </div>
              ))}
            </div>
          )}

          {tab === "settings" && (
            <div className="bg-background border border-border p-6 max-w-2xl grid sm:grid-cols-2 gap-4">
              {["Store name", "Support email", "VAT rate (%)", "Free delivery threshold"].map(
                (f) => (
                  <label key={f} className="text-sm">
                    <span className="text-xs text-muted-foreground">{f}</span>
                    <input
                      className="mt-1 h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-gold"
                      placeholder={f}
                    />
                  </label>
                ),
              )}
              <button className="sm:col-span-2 h-12 bg-charcoal-dark text-primary-foreground text-sm font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition">
                Save settings
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
