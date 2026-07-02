// Trigger matching — decides which flow an inbound message starts.
// Priority mirrors ManyChat: exact keyword > begins_with > contains > default reply.
import type { Flow, KeywordMatch } from "../types";

function keywordMatches(text: string, keyword: string, match: KeywordMatch): boolean {
  const t = text.trim().toLowerCase();
  const k = keyword.trim().toLowerCase();
  if (k === "") return false;
  switch (match) {
    case "is":
      return t === k;
    case "begins_with":
      return t.startsWith(k);
    case "contains":
      return t.includes(k);
  }
}

const MATCH_PRIORITY: Record<KeywordMatch, number> = { is: 0, begins_with: 1, contains: 2 };

export function matchTrigger(flows: Flow[], text: string): Flow | null {
  let best: { flow: Flow; priority: number } | null = null;
  for (const flow of flows) {
    for (const trigger of flow.triggers) {
      if (!trigger.enabled || trigger.type !== "keyword" || !trigger.keyword) continue;
      const match = trigger.match ?? "is";
      if (!keywordMatches(text, trigger.keyword, match)) continue;
      const priority = MATCH_PRIORITY[match];
      if (!best || priority < best.priority) best = { flow, priority };
    }
  }
  if (best) return best.flow;
  return flows.find((f) => f.triggers.some((t) => t.enabled && t.type === "default_reply")) ?? null;
}

export function findNewContactFlow(flows: Flow[]): Flow | null {
  return flows.find((f) => f.triggers.some((t) => t.enabled && t.type === "new_contact")) ?? null;
}
