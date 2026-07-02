import { describe, expect, test } from "vitest";
import {
  resumeWithButton,
  resumeWithInput,
  runFlow,
  type EngineDeps,
} from "../src/lib/engine/engine";
import { evaluateCondition } from "../src/lib/engine/conditions";
import { interpolate } from "../src/lib/engine/interpolate";
import { matchTrigger } from "../src/lib/engine/triggers";
import type { Contact, Flow, FlowGraph } from "../src/lib/types";

// ---------- fixtures ----------

const contact: Contact = {
  id: "ct_1",
  name: "Ada",
  fields: { email: "ada@example.com", score: "7" },
  tags: ["vip"],
  createdAt: "2026-01-01T00:00:00Z",
};

const deps: EngineDeps = { getGraph: () => null };

function flowWith(graph: FlowGraph, triggers: Flow["triggers"]): Flow {
  return { id: "f1", name: "Test", graph, triggers, updatedAt: "" };
}

// ---------- interpolation ----------

describe("interpolate", () => {
  test("replaces name and custom fields", () => {
    expect(interpolate("Hi {{name}}, mail: {{field:email}}", contact)).toBe(
      "Hi Ada, mail: ada@example.com",
    );
  });

  test("unknown fields become empty string", () => {
    expect(interpolate("X{{field:missing}}Y", contact)).toBe("XY");
  });
});

// ---------- conditions ----------

describe("evaluateCondition", () => {
  test("has_tag / not_has_tag", () => {
    expect(evaluateCondition({ field: "", op: "has_tag", value: "vip" }, contact)).toBe(true);
    expect(evaluateCondition({ field: "", op: "not_has_tag", value: "vip" }, contact)).toBe(false);
  });

  test("field comparisons are case-insensitive", () => {
    expect(evaluateCondition({ field: "name", op: "eq", value: "ADA" }, contact)).toBe(true);
    expect(evaluateCondition({ field: "email", op: "contains", value: "EXAMPLE" }, contact)).toBe(true);
  });

  test("numeric gt/lt", () => {
    expect(evaluateCondition({ field: "score", op: "gt", value: "5" }, contact)).toBe(true);
    expect(evaluateCondition({ field: "score", op: "lt", value: "5" }, contact)).toBe(false);
  });
});

// ---------- trigger matching ----------

describe("matchTrigger", () => {
  const emptyGraph: FlowGraph = { entryId: null, nodes: [], edges: [] };
  const kwFlow = (id: string, keyword: string, match: "is" | "contains" | "begins_with"): Flow => ({
    id,
    name: id,
    graph: emptyGraph,
    triggers: [{ id: "t", type: "keyword", keyword, match, enabled: true }],
    updatedAt: "",
  });

  test("exact match beats contains", () => {
    const flows = [kwFlow("contains", "price", "contains"), kwFlow("exact", "prices", "is")];
    expect(matchTrigger(flows, " Prices ")?.id).toBe("exact");
  });

  test("falls back to default_reply flow", () => {
    const fallback = flowWith(emptyGraph, [{ id: "t", type: "default_reply", enabled: true }]);
    expect(matchTrigger([kwFlow("kw", "hello", "is"), fallback], "unrelated")?.id).toBe("f1");
  });

  test("disabled triggers never match", () => {
    const flow = flowWith(emptyGraph, [
      { id: "t", type: "keyword", keyword: "hi", match: "is", enabled: false },
    ]);
    expect(matchTrigger([flow], "hi")).toBeNull();
  });
});

// ---------- flow traversal ----------

const branchingGraph: FlowGraph = {
  entryId: "n1",
  nodes: [
    { id: "n1", type: "condition", position: { x: 0, y: 0 }, data: { field: "", op: "has_tag", value: "vip" } },
    { id: "n2", type: "message", position: { x: 0, y: 0 }, data: { text: "VIP {{name}}", buttons: [] } },
    { id: "n3", type: "message", position: { x: 0, y: 0 }, data: { text: "Regular", buttons: [] } },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2", sourceHandle: "yes" },
    { id: "e2", source: "n1", target: "n3", sourceHandle: "no" },
  ],
};

describe("runFlow", () => {
  test("condition routes to the yes branch and interpolates", async () => {
    const result = await runFlow("f1", branchingGraph, null, { contact, lastMessage: "" }, deps);
    expect(result.outputs).toEqual([{ type: "message", text: "VIP Ada", buttons: [] }]);
    expect(result.state).toBeNull();
  });

  test("message with buttons pauses the flow", async () => {
    const graph: FlowGraph = {
      entryId: "n1",
      nodes: [
        {
          id: "n1",
          type: "message",
          position: { x: 0, y: 0 },
          data: { text: "Pick one", buttons: [{ id: "b1", label: "Yes" }] },
        },
      ],
      edges: [],
    };
    const result = await runFlow("f1", graph, null, { contact, lastMessage: "" }, deps);
    expect(result.state).toEqual({ flowId: "f1", waitNodeId: "n1", waitType: "buttons" });
  });

  test("actions affect later conditions in the same run", async () => {
    const graph: FlowGraph = {
      entryId: "a1",
      nodes: [
        { id: "a1", type: "action", position: { x: 0, y: 0 }, data: { kind: "add_tag", tag: "hot" } },
        { id: "c1", type: "condition", position: { x: 0, y: 0 }, data: { field: "", op: "has_tag", value: "hot" } },
        { id: "m1", type: "message", position: { x: 0, y: 0 }, data: { text: "Hot lead", buttons: [] } },
      ],
      edges: [
        { id: "e1", source: "a1", target: "c1" },
        { id: "e2", source: "c1", target: "m1", sourceHandle: "yes" },
      ],
    };
    const result = await runFlow("f1", graph, null, { contact, lastMessage: "" }, deps);
    expect(result.outputs).toContainEqual({ type: "add_tag", tag: "hot" });
    expect(result.outputs).toContainEqual({ type: "message", text: "Hot lead", buttons: [] });
  });

  test("delay stops execution and reports the resume node", async () => {
    const graph: FlowGraph = {
      entryId: "d1",
      nodes: [
        { id: "d1", type: "delay", position: { x: 0, y: 0 }, data: { seconds: 60 } },
        { id: "m1", type: "message", position: { x: 0, y: 0 }, data: { text: "Later", buttons: [] } },
      ],
      edges: [{ id: "e1", source: "d1", target: "m1" }],
    };
    const result = await runFlow("f1", graph, null, { contact, lastMessage: "" }, deps);
    expect(result.outputs).toEqual([
      { type: "delay", seconds: 60, flowId: "f1", resumeNodeId: "m1" },
    ]);
  });

  test("ai node uses generateAi and falls back on error", async () => {
    const graph: FlowGraph = {
      entryId: "ai1",
      nodes: [
        {
          id: "ai1",
          type: "ai",
          position: { x: 0, y: 0 },
          data: { systemPrompt: "Assist", fallbackText: "fallback" },
        },
      ],
      edges: [],
    };
    const ok = await runFlow("f1", graph, null, { contact, lastMessage: "hi" }, {
      ...deps,
      generateAi: async () => "ai says hi",
    });
    expect(ok.outputs[0]).toEqual({ type: "message", text: "ai says hi", buttons: [] });

    const failing = await runFlow("f1", graph, null, { contact, lastMessage: "hi" }, {
      ...deps,
      generateAi: async () => {
        throw new Error("ollama down");
      },
    });
    expect(failing.outputs[0]).toEqual({ type: "message", text: "fallback", buttons: [] });
  });

  test("start_flow jumps into another graph", async () => {
    const target: FlowGraph = {
      entryId: "t1",
      nodes: [{ id: "t1", type: "message", position: { x: 0, y: 0 }, data: { text: "Jumped", buttons: [] } }],
      edges: [],
    };
    const graph: FlowGraph = {
      entryId: "s1",
      nodes: [{ id: "s1", type: "start_flow", position: { x: 0, y: 0 }, data: { flowId: "other" } }],
      edges: [],
    };
    const result = await runFlow("f1", graph, null, { contact, lastMessage: "" }, {
      getGraph: (id) => (id === "other" ? target : null),
    });
    expect(result.outputs).toEqual([{ type: "message", text: "Jumped", buttons: [] }]);
  });

  test("cyclic graphs terminate via step guard", async () => {
    const graph: FlowGraph = {
      entryId: "a",
      nodes: [
        { id: "a", type: "action", position: { x: 0, y: 0 }, data: { kind: "add_tag", tag: "x" } },
        { id: "b", type: "action", position: { x: 0, y: 0 }, data: { kind: "add_tag", tag: "y" } },
      ],
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "a" },
      ],
    };
    const result = await runFlow("f1", graph, null, { contact, lastMessage: "" }, deps);
    expect(result.outputs.length).toBeLessThanOrEqual(50);
  });
});

// ---------- resume paths ----------

describe("resume", () => {
  const buttonGraph: FlowGraph = {
    entryId: "m1",
    nodes: [
      {
        id: "m1",
        type: "message",
        position: { x: 0, y: 0 },
        data: { text: "Pick", buttons: [{ id: "b1", label: "Pricing" }] },
      },
      { id: "m2", type: "message", position: { x: 0, y: 0 }, data: { text: "Here are prices", buttons: [] } },
    ],
    edges: [{ id: "e1", source: "m1", target: "m2", sourceHandle: "b1" }],
  };
  const waiting = { flowId: "f1", waitNodeId: "m1", waitType: "buttons" as const };

  test("button resume matches by label, case-insensitive", async () => {
    const result = await resumeWithButton(buttonGraph, waiting, "  pricing ", { contact, lastMessage: "pricing" }, deps);
    expect(result?.outputs).toEqual([{ type: "message", text: "Here are prices", buttons: [] }]);
  });

  test("non-button reply returns null so triggers can take over", async () => {
    const result = await resumeWithButton(buttonGraph, waiting, "something else", { contact, lastMessage: "x" }, deps);
    expect(result).toBeNull();
  });

  test("input resume stores the answer and continues", async () => {
    const graph: FlowGraph = {
      entryId: "u1",
      nodes: [
        { id: "u1", type: "user_input", position: { x: 0, y: 0 }, data: { question: "Email?", fieldKey: "email" } },
        { id: "m1", type: "message", position: { x: 0, y: 0 }, data: { text: "Saved {{field:email}}", buttons: [] } },
      ],
      edges: [{ id: "e1", source: "u1", target: "m1" }],
    };
    const state = { flowId: "f1", waitNodeId: "u1", waitType: "input" as const, fieldKey: "email" };
    const result = await resumeWithInput(graph, state, "new@mail.com", { contact, lastMessage: "new@mail.com" }, deps);
    expect(result.outputs).toEqual([
      { type: "set_field", key: "email", value: "new@mail.com" },
      { type: "message", text: "Saved new@mail.com", buttons: [] },
    ]);
  });
});
