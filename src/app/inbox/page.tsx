"use client";

// Inbox — ManyChat-style live chat, doubling as the local channel simulator:
// you type as the contact, the automation engine answers as the bot, and you
// can take over as a human agent at any time.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Contact, Conversation } from "@/lib/types";

interface InboxConversation extends Conversation {
  contact: Contact | null;
  lastMessage: ChatMessage | null;
}

interface ThreadData {
  conversation: Conversation;
  contact: Contact;
  messages: ChatMessage[];
}

const POLL_MS = 1500; // delays + AI replies arrive asynchronously

const SENDER_STYLES: Record<ChatMessage["sender"], string> = {
  contact: "self-start bg-surface-2 text-ink",
  bot: "self-end bg-accent text-accent-ink",
  agent: "self-end border border-accent bg-surface text-ink",
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [draft, setDraft] = useState("");
  const [agentDraft, setAgentDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      setConversations(await res.json());
    } catch {
      /* server briefly unavailable — keep last state */
    }
  }, []);

  const refreshThread = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await fetch(`/api/conversations/${activeId}`);
      if (res.ok) setThread(await res.json());
    } catch {
      /* keep last state */
    }
  }, [activeId]);

  // Initial load runs as a scheduled task (not a direct effect call) so the
  // render pass stays pure; the interval keeps the view live afterwards.
  useEffect(() => {
    queueMicrotask(refreshList);
    const timer = setInterval(refreshList, POLL_MS * 2);
    return () => clearInterval(timer);
  }, [refreshList]);

  useEffect(() => {
    queueMicrotask(refreshThread);
    const timer = setInterval(refreshThread, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshThread]);

  // Auto-scroll only when new messages arrive
  useEffect(() => {
    const count = thread?.messages.length ?? 0;
    if (count !== lastCountRef.current) {
      lastCountRef.current = count;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread]);

  async function sendAsContact(text: string) {
    if (!thread || text.trim() === "" || isSending) return;
    setIsSending(true);
    try {
      await fetch("/api/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: thread.contact.id, text }),
      });
      setDraft("");
      await Promise.all([refreshThread(), refreshList()]);
    } finally {
      setIsSending(false);
    }
  }

  async function sendAsAgent() {
    if (!thread || agentDraft.trim() === "") return;
    await fetch(`/api/conversations/${thread.conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentMessage: agentDraft }),
    });
    setAgentDraft("");
    await refreshThread();
  }

  async function setStatus(status: "bot" | "human") {
    if (!thread) return;
    await fetch(`/api/conversations/${thread.conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refreshThread();
  }

  async function createContact() {
    if (newName.trim() === "") return;
    const res = await fetch("/api/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data: { conversationId: string } = await res.json();
    setNewName("");
    await refreshList();
    setActiveId(data.conversationId);
  }

  const lastBotMessage = thread?.messages.filter((m) => m.sender === "bot").at(-1);
  const isHuman = thread?.conversation.status === "human";

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            simulate new contact
          </p>
          <div className="flex gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createContact()}
              placeholder="Contact name…"
              className="w-full rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={createContact}
              className="shrink-0 rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`block w-full border-b border-line px-4 py-3 text-left transition-colors ${
                conv.id === activeId ? "bg-surface-2" : "hover:bg-surface-2/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{conv.contact?.name ?? "Unknown"}</p>
                <span
                  className={`font-mono text-[9px] uppercase ${
                    conv.status === "human" ? "text-amber-400" : "text-accent"
                  }`}
                >
                  {conv.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-faint">
                {conv.lastMessage?.text ?? "no messages"}
              </p>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="p-4 text-xs text-ink-faint">
              No conversations. Create a contact above — the welcome flow will greet them.
            </p>
          )}
        </div>
      </div>

      {/* Thread */}
      {thread ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
            <p className="text-sm font-semibold">{thread.contact.name}</p>
            <button
              onClick={() => setStatus(isHuman ? "bot" : "human")}
              className={`rounded-md border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                isHuman
                  ? "border-amber-400 text-amber-400"
                  : "border-line text-ink-dim hover:border-amber-400 hover:text-amber-400"
              }`}
            >
              {isHuman ? "hand back to bot" : "take over as human"}
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
            {thread.messages.map((msg) => (
              <div key={msg.id} className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${SENDER_STYLES[msg.sender]}`}>
                {msg.sender !== "contact" && (
                  <p className="mb-0.5 font-mono text-[9px] uppercase tracking-wider opacity-60">
                    {msg.sender}
                  </p>
                )}
                {msg.text}
              </div>
            ))}
            {/* Tappable quick replies from the latest bot message */}
            {lastBotMessage?.buttons && lastBotMessage.id === thread.messages.at(-1)?.id && (
              <div className="flex gap-2 self-start pl-1">
                {lastBotMessage.buttons.map((button) => (
                  <button
                    key={button.id}
                    onClick={() => sendAsContact(button.label)}
                    className="rounded-full border border-accent px-3 py-1 text-xs text-accent transition-colors hover:bg-accent hover:text-accent-ink"
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Contact simulator composer */}
          <div className="border-t border-line bg-surface p-3">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              reply as {thread.contact.name} (contact)
            </p>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendAsContact(draft)}
                placeholder='Try "prices" or "start"…'
                className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => sendAsContact(draft)}
                disabled={isSending}
                className="shrink-0 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {isHuman && (
              <div className="mt-2 flex gap-2">
                <input
                  value={agentDraft}
                  onChange={(e) => setAgentDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAsAgent()}
                  placeholder="Reply as human agent…"
                  className="w-full rounded-md border border-amber-400/40 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <button
                  onClick={sendAsAgent}
                  className="shrink-0 rounded-md border border-amber-400 px-4 text-sm font-semibold text-amber-400"
                >
                  Agent
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-sm text-ink-faint">select or create a conversation</p>
        </div>
      )}

      {/* Contact panel */}
      {thread && (
        <div className="w-64 shrink-0 border-l border-line bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">contact</p>
          <p className="mt-1 text-base font-semibold">{thread.contact.name}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">tags</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {thread.contact.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-accent/40 px-2 py-0.5 font-mono text-[10px] text-accent">
                {tag}
              </span>
            ))}
            {thread.contact.tags.length === 0 && <span className="text-xs text-ink-faint">—</span>}
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">fields</p>
          <dl className="mt-1.5 space-y-1">
            {Object.entries(thread.contact.fields).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 text-xs">
                <dt className="font-mono text-ink-faint">{key}</dt>
                <dd className="truncate text-ink">{value}</dd>
              </div>
            ))}
            {Object.keys(thread.contact.fields).length === 0 && (
              <p className="text-xs text-ink-faint">—</p>
            )}
          </dl>
          {thread.conversation.state && (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                flow status
              </p>
              <p className="mt-1 text-xs text-amber-400">
                waiting for {thread.conversation.state.waitType}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
