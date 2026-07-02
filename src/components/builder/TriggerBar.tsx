"use client";

// Trigger editor — the "when does this flow start" strip above the canvas.
import type { KeywordMatch, Trigger, TriggerType } from "@/lib/types";

interface TriggerBarProps {
  triggers: Trigger[];
  onChange: (triggers: Trigger[]) => void;
}

const selectClass =
  "rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-accent";

export function TriggerBar({ triggers, onChange }: TriggerBarProps) {
  function update(index: number, patch: Partial<Trigger>) {
    onChange(triggers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        triggers
      </span>
      {triggers.map((trigger, i) => (
        <div
          key={trigger.id}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
            trigger.enabled ? "border-accent/40" : "border-line opacity-60"
          }`}
        >
          <select
            className={selectClass}
            value={trigger.type}
            onChange={(e) => update(i, { type: e.target.value as TriggerType })}
          >
            <option value="keyword">keyword</option>
            <option value="new_contact">new contact</option>
            <option value="default_reply">default reply</option>
          </select>
          {trigger.type === "keyword" && (
            <>
              <select
                className={selectClass}
                value={trigger.match ?? "is"}
                onChange={(e) => update(i, { match: e.target.value as KeywordMatch })}
              >
                <option value="is">is</option>
                <option value="begins_with">begins with</option>
                <option value="contains">contains</option>
              </select>
              <input
                className={`${selectClass} w-28`}
                value={trigger.keyword ?? ""}
                placeholder="keyword"
                onChange={(e) => update(i, { keyword: e.target.value })}
              />
            </>
          )}
          <button
            onClick={() => update(i, { enabled: !trigger.enabled })}
            className={`font-mono text-[10px] uppercase ${trigger.enabled ? "text-accent" : "text-ink-faint"}`}
            title="Toggle trigger"
          >
            {trigger.enabled ? "on" : "off"}
          </button>
          <button
            onClick={() => onChange(triggers.filter((_, j) => j !== i))}
            className="text-xs text-ink-faint hover:text-red-400"
            aria-label="Remove trigger"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...triggers,
            {
              id: `t_${crypto.randomUUID().slice(0, 6)}`,
              type: "keyword",
              keyword: "",
              match: "is",
              enabled: true,
            },
          ])
        }
        className="rounded-md border border-dashed border-line px-2.5 py-1 font-mono text-[11px] text-ink-dim hover:border-accent hover:text-accent"
      >
        + trigger
      </button>
    </div>
  );
}
