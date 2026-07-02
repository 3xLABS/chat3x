import { NextResponse } from "next/server";
import { listContacts } from "@/lib/repo";

export async function GET() {
  return NextResponse.json(listContacts());
}
