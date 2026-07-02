"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Flow } from "@/lib/types";

interface Stats {
  contacts: number;
  flows: number;
  conversations: number;
  messagesOut: number;
  messagesIn: number;
  triggers: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  keyword: "keyword",
  new_contact: "new contact",
  default_reply: "default reply",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => setStats(null));
    fetch("/api/flows").then((r) => r.json()).then(setFlows).catch(() => setFlows([]));
  }, []);

  const cards = stats
    ? [
        { label: "Contacts", value: stats.contacts },
        { label: "Active Triggers", value: stats.triggers },
        { label: "Conversations", value: stats.conversations },
        { label: "Messages Sent", value: stats.messagesOut },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">console</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Automation, on your machine.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-dim">
          Trigger → Flow → Action. Every contact, message and flow lives in a local SQLite
          file — nothing leaves this computer.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-line bg-surface p-5">
            <p className="font-mono text-4xl font-semibold text-accent">{card.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink-faint">{card.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Flows</h2>
          <Link href="/flows" className="text-sm text-accent hover:underline">
            Open builder →
          </Link>
        </div>
        <div className="divide-y divide-line rounded-lg border border-line bg-surface">
          {flows.map((flow) => (
            <Link
              key={flow.id}
              href={`/flows/${flow.id}`}
              className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-surface-2"
            >
              <div>
                <p className="text-sm font-medium">{flow.name}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-faint">
                  {flow.graph.nodes.length} nodes · {flow.graph.edges.length} connections
                </p>
              </div>
              <div className="flex gap-2">
                {flow.triggers.filter((t) => t.enabled).map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-dim"
                  >
                    {t.type === "keyword" ? `kw: ${t.keyword}` : TRIGGER_LABELS[t.type]}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
