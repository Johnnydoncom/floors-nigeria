"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import type { KnowledgeSource } from "@/lib/ai-support/types";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/ai-support/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [source, setSource] = useState<KnowledgeSource | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    params.then(({ id }) => setSourceId(id));
  }, [params]);

  const loadSource = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    const data = await adminFetch<KnowledgeSource>(`knowledge/${sourceId}`);
    setSource(data);
    setLoading(false);
  }, [sourceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the API; state is set after the fetch resolves
    loadSource();
  }, [loadSource]);

  const handleApprove = async () => {
    if (!sourceId) return;
    await adminFetch(`knowledge/${sourceId}/approve`, { method: "POST" });
    await loadSource();
  };

  const handleReindex = async () => {
    if (!sourceId) return;
    await adminFetch(`knowledge/${sourceId}/reindex`, { method: "POST" });
    await loadSource();
  };

  const handleDelete = async () => {
    if (!sourceId || !confirm("Delete this knowledge source and all its chunks?")) return;
    await adminFetch(`knowledge/${sourceId}`, { method: "DELETE" });
    router.push("/admin/support-knowledge");
  };

  if (loading || !source) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/support-knowledge")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{source.title}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {source.type.replace(/_/g, " ")} · {source.status.replace(/_/g, " ")} ·{" "}
              {source.ingestion_status}
              {source.chunks_count !== undefined && ` · ${source.chunks_count} chunks`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {source.status !== "approved" && (
            <button
              onClick={handleApprove}
              className="btn btn-primary h-8 rounded-md px-3 text-xs flex items-center gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve & Index
            </button>
          )}
          <button
            onClick={handleReindex}
            className="btn btn-outline h-8 rounded-md px-3 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reindex
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-outline h-8 rounded-md px-3 text-xs text-destructive flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{source.type.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{source.status.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Indexing</dt>
              <dd className="capitalize">{source.ingestion_status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Chunks</dt>
              <dd>{source.chunks_count ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Owner</dt>
              <dd>{source.owner?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last indexed</dt>
              <dd>
                {source.ingested_at ? new Date(source.ingested_at).toLocaleDateString() : "Never"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">Source reference</h3>
          <p className="text-sm text-muted-foreground">
            {source.source_reference ?? "No external reference set."}
          </p>
        </div>
      </div>
    </div>
  );
}
