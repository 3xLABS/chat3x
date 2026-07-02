// Inbound endpoint for the local channel — the equivalent of a
// Messenger/Instagram webhook, but fed by the built-in chat simulator.
import { NextResponse } from "next/server";
import { getOrCreateConversation } from "@/lib/repo";
import { handleInbound, handleNewContact } from "@/lib/runtime";

export async function POST(request: Request) {
  let body: { contactId?: unknown; name?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // New contact entering the channel → welcome flow
  if (!body.contactId) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "name is required for new contacts" }, { status: 400 });
    }
    const { contact, messages } = await handleNewContact(body.name);
    const conversation = getOrCreateConversation(contact.id);
    return NextResponse.json({ contact, conversationId: conversation.id, messages });
  }

  if (typeof body.contactId !== "string" || typeof body.text !== "string" || body.text.trim() === "") {
    return NextResponse.json({ error: "contactId and non-empty text are required" }, { status: 400 });
  }

  try {
    const messages = await handleInbound(body.contactId, body.text.trim());
    const conversation = getOrCreateConversation(body.contactId);
    return NextResponse.json({ conversationId: conversation.id, messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inbound processing failed" },
      { status: 400 },
    );
  }
}
