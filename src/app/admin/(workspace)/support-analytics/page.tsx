"use client";

import { useEffect, useState } from "react";
import { BarChart3, DollarSign, MessageSquare, Users, Zap } from "lucide-react";
import type { AnalyticsData } from "@/lib/ai-support/types";

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/admin/ai-support/${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

export default function SupportAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    const qs = params.toString();

    adminFetch<AnalyticsData>(`analytics${qs ? `?${qs}` : ""}`)
      .then(setData)
      .catch(console.error);
  }, [range]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const avgResponseTime = data.avg_first_response_seconds
    ? data.avg_first_response_seconds < 60
      ? `${Math.round(data.avg_first_response_seconds)}s`
      : `${Math.round(data.avg_first_response_seconds / 60)}m`
    : "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> AI Support Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance metrics and cost tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="rounded-md border px-2 py-1 text-sm"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="rounded-md border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Total conversations"
          value={data.total_conversations}
          subtext={`${data.conversations_today} today`}
        />
        <StatCard
          icon={Zap}
          label="Avg response time"
          value={avgResponseTime}
          subtext="First AI response"
        />
        <StatCard
          icon={Users}
          label="Escalations"
          value={data.escalation_count}
          subtext="Escalated to human"
        />
        <StatCard
          icon={DollarSign}
          label="AI cost"
          value={`$${data.total_ai_cost.toFixed(2)}`}
          subtext={`${data.messages_today} messages today`}
        />
      </div>

      {/* Breakdown tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">By channel</h3>
          </div>
          <div className="divide-y">
            {Object.entries(data.conversations_by_channel).map(([channel, count]) => (
              <div key={channel} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="capitalize">{channel}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(data.conversations_by_channel).length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No data yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">By status</h3>
          </div>
          <div className="divide-y">
            {Object.entries(data.conversations_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="capitalize">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(data.conversations_by_status).length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
