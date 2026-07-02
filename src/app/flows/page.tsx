"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Flow } from "@/lib/types";

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetch("/api/flows").then((r) => r.json()).then(setFlows).catch(() => setFlows([]));
  }, []);

  async function createFlow() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Flow" }),
      });
      const flow: Flow = await res.json();
      router.push(`/flows/${flow.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function removeFlow(id: string) {
    await fetch(`/api/flows/${id}`, { method: "DELETE" });
    setFlows((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">builder</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Flows</h1>
        </div>
        <button
          onClick={createFlow}
          disabled={isCreating}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          + New Flow
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="group rounded-lg border border-line bg-surface p-5 transition-colors hover:border-ink-faint"
          >
            <div className="flex items-start justify-between">
              <Link href={`/flows/${flow.id}`} className="min-w-0">
                <h2 className="truncate text-base font-semibold group-hover:text-accent">
                  {flow.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-ink-faint">
                  {flow.graph.nodes.length} nodes · updated{" "}
                  {new Date(flow.updatedAt).toLocaleString()}
                </p>
              </Link>
              <button
                onClick={() => removeFlow(flow.id)}
                className="text-xs text-ink-faint transition-colors hover:text-red-400"
                aria-label={`Delete ${flow.name}`}
              >
                delete
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {flow.triggers.map((t) => (
                <span
                  key={t.id}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    t.enabled ? "border-accent/40 text-accent" : "border-line text-ink-faint line-through"
                  }`}
                >
                  {t.type === "keyword" ? `${t.match}: ${t.keyword}` : t.type.replace("_", " ")}
                </span>
              ))}
              {flow.triggers.length === 0 && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  no triggers — flow is dormant
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
