import { NextResponse } from "next/server";
import { getContact, listConversations, listMessages } from "@/lib/repo";

// Inbox list view: each conversation joined with its contact and last message
export async function GET() {
  const conversations = listConversations().map((conv) => {
    const messages = listMessages(conv.id);
    return {
      ...conv,
      contact: getContact(conv.contactId),
      lastMessage: messages[messages.length - 1] ?? null,
    };
  });
  return NextResponse.json(conversations);
}
