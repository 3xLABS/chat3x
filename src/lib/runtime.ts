// Runtime — the impure counterpart of the engine. Receives inbound
// messages, picks flows via triggers, runs the engine, and applies
// outputs (persist messages, mutate contacts, schedule delays).
import { generateAiReply } from "./ai";
import {
  resumeWithButton,
  resumeWithInput,
  runFlow,
  type EngineDeps,
  type EngineOutput,
  type EngineResult,
} from "./engine/engine";
import { findNewContactFlow, matchTrigger } from "./engine/triggers";
import {
  appendMessage,
  createContact,
  getContact,
  getFlow,
  getOrCreateConversation,
  listFlows,
  saveContact,
  saveConversation,
} from "./repo";
import type { ChatMessage, Contact, Conversation } from "./types";

const deps: EngineDeps = {
  getGraph: (flowId) => getFlow(flowId)?.graph ?? null,
  generateAi: generateAiReply,
};

/** Persist engine outputs; returns the bot messages created right now. */
function applyOutputs(
  conv: Conversation,
  contact: Contact,
  outputs: EngineOutput[],
): ChatMessage[] {
  const sent: ChatMessage[] = [];
  for (const output of outputs) {
    switch (output.type) {
      case "message":
        sent.push(appendMessage(conv.id, "bot", output.text, output.buttons.length ? output.buttons : null));
        break;
      case "add_tag":
        if (!contact.tags.includes(output.tag)) contact.tags.push(output.tag);
        break;
      case "remove_tag":
        contact.tags = contact.tags.filter((t) => t !== output.tag);
        break;
      case "set_field":
        contact.fields[output.key] = output.value;
        break;
      case "delay":
        scheduleResume(conv.id, contact.id, output);
        break;
    }
  }
  saveContact(contact);
  return sent;
}

// Delays run in-process via setTimeout — fine for a local single-user tool.
// (Not durable across server restarts; a dueAt queue table is the upgrade path.)
function scheduleResume(
  conversationId: string,
  contactId: string,
  delay: Extract<EngineOutput, { type: "delay" }>,
): void {
  setTimeout(async () => {
    try {
      const contact = getContact(contactId);
      const flow = getFlow(delay.flowId);
      const conv = getOrCreateConversation(contactId);
      if (!contact || !flow || conv.id !== conversationId) return;
      const result = await runFlow(delay.flowId, flow.graph, delay.resumeNodeId, { contact, lastMessage: "" }, deps);
      finishRun(conv, contact, result);
    } catch (error) {
      console.error("[chat3x] delayed resume failed:", error);
    }
  }, delay.seconds * 1000);
}

function finishRun(conv: Conversation, contact: Contact, result: EngineResult): ChatMessage[] {
  const sent = applyOutputs(conv, contact, result.outputs);
  conv.state = result.state;
  saveConversation(conv);
  return sent;
}

/**
 * Main inbound pipeline: contact message → (resume waiting flow | match
 * trigger) → run engine → persist. Returns every message created now.
 */
export async function handleInbound(contactId: string, text: string): Promise<ChatMessage[]> {
  const contact = getContact(contactId);
  if (!contact) throw new Error(`Unknown contact: ${contactId}`);
  const conv = getOrCreateConversation(contactId);
  const created: ChatMessage[] = [appendMessage(conv.id, "contact", text)];

  // Human agent has taken over — automation stays out of the way
  if (conv.status === "human") return created;

  const ctx = { contact, lastMessage: text };

  // 1) A flow is waiting on this contact → try to resume it
  if (conv.state) {
    const flow = getFlow(conv.state.flowId);
    if (flow) {
      const result =
        conv.state.waitType === "input"
          ? await resumeWithInput(flow.graph, conv.state, text, ctx, deps)
          : await resumeWithButton(flow.graph, conv.state, text, ctx, deps);
      if (result) return [...created, ...finishRun(conv, contact, result)];
    }
    conv.state = null; // stale or unmatched → fall through to triggers
    saveConversation(conv);
  }

  // 2) Fresh message → trigger matching (keyword, then default reply)
  const flow = matchTrigger(listFlows(), text);
  if (!flow) return created;
  const result = await runFlow(flow.id, flow.graph, null, ctx, deps);
  return [...created, ...finishRun(conv, contact, result)];
}

/** New contact enters the system → run the new_contact (welcome) flow. */
export async function handleNewContact(name: string): Promise<{ contact: Contact; messages: ChatMessage[] }> {
  const contact = createContact(name.trim() || "Anonymous");
  const conv = getOrCreateConversation(contact.id);
  const flow = findNewContactFlow(listFlows());
  if (!flow) return { contact, messages: [] };
  const result = await runFlow(flow.id, flow.graph, null, { contact, lastMessage: "" }, deps);
  return { contact, messages: finishRun(conv, contact, result) };
}
