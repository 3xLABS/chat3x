import { NextResponse } from "next/server";
import {
  appendMessage,
  getContact,
  getConversation,
  listMessages,
  saveConversation,
} from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

// Thread view: conversation + contact + full message history
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  return NextResponse.json({
    conversation,
    contact: getContact(conversation.contactId),
    messages: listMessages(id),
  });
}

// Agent controls: take over / hand back to bot, send a human reply
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  let body: { status?: unknown; agentMessage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status === "bot" || body.status === "human") {
    conversation.status = body.status;
    if (body.status === "human") conversation.state = null; // pause any waiting flow
    saveConversation(conversation);
  }
  if (typeof body.agentMessage === "string" && body.agentMessage.trim() !== "") {
    appendMessage(conversation.id, "agent", body.agentMessage.trim());
  }
  return NextResponse.json({ conversation });
}
