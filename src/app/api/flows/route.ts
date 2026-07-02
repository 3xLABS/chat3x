import { NextResponse } from "next/server";
import { newId } from "@/lib/db";
import { listFlows, saveFlow } from "@/lib/repo";
import type { Flow } from "@/lib/types";

export async function GET() {
  return NextResponse.json(listFlows());
}

export async function POST(request: Request) {
  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Flow";
  const entryId = newId("node");
  const flow: Flow = {
    id: newId("flow"),
    name,
    graph: {
      entryId,
      nodes: [
        {
          id: entryId,
          type: "message",
          position: { x: 80, y: 120 },
          data: { text: "Hey {{name}}!", buttons: [] },
        },
      ],
      edges: [],
    },
    triggers: [],
    updatedAt: "",
  };
  return NextResponse.json(saveFlow(flow), { status: 201 });
}
