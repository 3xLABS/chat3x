// Seed data: demo flows covering every node type, so the app is
// explorable immediately after first boot.
import type DatabaseType from "better-sqlite3";
import type { Flow, FlowGraph } from "./types";

function welcomeGraph(): FlowGraph {
  return {
    entryId: "n1",
    nodes: [
      {
        id: "n1",
        type: "message",
        position: { x: 0, y: 0 },
        data: {
          text: "Hey {{name}} 👋 Welcome to CHAT3X. What are you here for?",
          buttons: [
            { id: "b1", label: "See pricing" },
            { id: "b2", label: "Just browsing" },
          ],
        },
      },
      {
        id: "n2",
        type: "start_flow",
        position: { x: 380, y: -80 },
        data: { flowId: "flow_pricing" },
      },
      {
        id: "n3",
        type: "action",
        position: { x: 380, y: 120 },
        data: { kind: "add_tag", tag: "browsing" },
      },
      {
        id: "n4",
        type: "message",
        position: { x: 720, y: 120 },
        data: { text: "No stress — type PRICES anytime to see plans.", buttons: [] },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", sourceHandle: "b1" },
      { id: "e2", source: "n1", target: "n3", sourceHandle: "b2" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  };
}

function pricingGraph(): FlowGraph {
  return {
    entryId: "n1",
    nodes: [
      {
        id: "n1",
        type: "condition",
        position: { x: 0, y: 0 },
        data: { field: "", op: "has_tag", value: "vip" },
      },
      {
        id: "n2",
        type: "message",
        position: { x: 380, y: -100 },
        data: { text: "VIP rate for you, {{name}}: Pro at $19/mo (50% off). 🖤", buttons: [] },
      },
      {
        id: "n3",
        type: "message",
        position: { x: 380, y: 100 },
        data: {
          text: "Plans: Free / Pro $39/mo / Scale $99/mo. Want the full breakdown?",
          buttons: [{ id: "b1", label: "Yes, email it" }],
        },
      },
      {
        id: "n4",
        type: "user_input",
        position: { x: 760, y: 100 },
        data: { question: "What email should I send it to?", fieldKey: "email" },
      },
      {
        id: "n5",
        type: "message",
        position: { x: 1140, y: 100 },
        data: { text: "Done — breakdown goes to {{field:email}}. ✅", buttons: [] },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", sourceHandle: "yes" },
      { id: "e2", source: "n1", target: "n3", sourceHandle: "no" },
      { id: "e3", source: "n3", target: "n4", sourceHandle: "b1" },
      { id: "e4", source: "n4", target: "n5" },
    ],
  };
}

function leadGraph(): FlowGraph {
  return {
    entryId: "n1",
    nodes: [
      {
        id: "n1",
        type: "user_input",
        position: { x: 0, y: 0 },
        data: { question: "Quick one, {{name}} — what's your company called?", fieldKey: "company" },
      },
      {
        id: "n2",
        type: "action",
        position: { x: 380, y: 0 },
        data: { kind: "add_tag", tag: "lead" },
      },
      {
        id: "n3",
        type: "delay",
        position: { x: 700, y: 0 },
        data: { seconds: 2 },
      },
      {
        id: "n4",
        type: "message",
        position: { x: 1020, y: 0 },
        data: { text: "{{field:company}} — love it. You're on the early-access list. 🚀", buttons: [] },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  };
}

function aiFallbackGraph(): FlowGraph {
  return {
    entryId: "n1",
    nodes: [
      {
        id: "n1",
        type: "ai",
        position: { x: 0, y: 0 },
        data: {
          systemPrompt:
            "You are the CHAT3X assistant, a chat-automation tool that runs locally. Be helpful and concise (max 2 sentences).",
          fallbackText:
            "I didn't catch that — try PRICES for plans or START to join early access.",
        },
      },
    ],
    edges: [],
  };
}

export function seedDatabase(db: DatabaseType.Database): void {
  const ts = new Date().toISOString();
  const insertFlow = db.prepare(
    "INSERT INTO flows (id, name, graph, triggers, updatedAt) VALUES (?, ?, ?, ?, ?)",
  );
  const flows: Array<Pick<Flow, "id" | "name" | "graph" | "triggers">> = [
    {
      id: "flow_welcome",
      name: "Welcome — New Contact",
      graph: welcomeGraph(),
      triggers: [{ id: "t1", type: "new_contact", enabled: true }],
    },
    {
      id: "flow_pricing",
      name: "Pricing — Keyword",
      graph: pricingGraph(),
      triggers: [{ id: "t2", type: "keyword", keyword: "prices", match: "contains", enabled: true }],
    },
    {
      id: "flow_lead",
      name: "Early Access — Lead Capture",
      graph: leadGraph(),
      triggers: [{ id: "t3", type: "keyword", keyword: "start", match: "is", enabled: true }],
    },
    {
      id: "flow_ai",
      name: "AI Fallback — Default Reply",
      graph: aiFallbackGraph(),
      triggers: [{ id: "t4", type: "default_reply", enabled: true }],
    },
  ];
  for (const f of flows) {
    insertFlow.run(f.id, f.name, JSON.stringify(f.graph), JSON.stringify(f.triggers), ts);
  }

  const insertContact = db.prepare(
    "INSERT INTO contacts (id, name, fields, tags, createdAt) VALUES (?, ?, ?, ?, ?)",
  );
  insertContact.run("ct_ada", "Ada Lovelace", JSON.stringify({ email: "ada@analytical.engine" }), JSON.stringify(["vip"]), ts);
  insertContact.run("ct_grace", "Grace Hopper", "{}", JSON.stringify(["browsing"]), ts);
}
