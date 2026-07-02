import { NextResponse } from "next/server";
import { getStats, listFlows } from "@/lib/repo";

export async function GET() {
  return NextResponse.json({
    ...getStats(),
    triggers: listFlows().flatMap((f) => f.triggers.filter((t) => t.enabled)).length,
  });
}
