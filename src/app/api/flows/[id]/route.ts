import { NextResponse } from "next/server";
import { deleteFlow, getFlow, saveFlow } from "@/lib/repo";
import type { Flow, FlowGraph, Trigger } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const flow = getFlow(id);
  if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  return NextResponse.json(flow);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = getFlow(id);
  if (!existing) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

  let body: { name?: unknown; graph?: unknown; triggers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const graph = body.graph as FlowGraph | undefined;
  if (graph && (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges))) {
    return NextResponse.json({ error: "graph must contain nodes[] and edges[]" }, { status: 400 });
  }

  const updated: Flow = {
    ...existing,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
    graph: graph ?? existing.graph,
    triggers: Array.isArray(body.triggers) ? (body.triggers as Trigger[]) : existing.triggers,
  };
  return NextResponse.json(saveFlow(updated));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  deleteFlow(id);
  return NextResponse.json({ ok: true });
}
