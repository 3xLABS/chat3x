// Repository layer — all reads/writes go through here so the storage
// mechanism stays swappable and the JSON columns stay encapsulated.
import { getDb, newId, now } from "./db";
import type {
  ChatMessage,
  Contact,
  Conversation,
  Flow,
  FlowState,
  QuickReplyButton,
} from "./types";

type Row = Record<string, unknown>;

// ---------- contacts ----------

function rowToContact(r: Row): Contact {
  return {
    id: r.id as string,
    name: r.name as string,
    fields: JSON.parse(r.fields as string),
    tags: JSON.parse(r.tags as string),
    createdAt: r.createdAt as string,
  };
}

export function listContacts(): Contact[] {
  return (getDb().prepare("SELECT * FROM contacts ORDER BY createdAt DESC").all() as Row[]).map(
    rowToContact,
  );
}

export function getContact(id: string): Contact | null {
  const r = getDb().prepare("SELECT * FROM contacts WHERE id = ?").get(id) as Row | undefined;
  return r ? rowToContact(r) : null;
}

export function createContact(name: string): Contact {
  const contact: Contact = { id: newId("ct"), name, fields: {}, tags: [], createdAt: now() };
  getDb()
    .prepare("INSERT INTO contacts (id, name, fields, tags, createdAt) VALUES (?, ?, '{}', '[]', ?)")
    .run(contact.id, contact.name, contact.createdAt);
  return contact;
}

export function saveContact(contact: Contact): void {
  getDb()
    .prepare("UPDATE contacts SET name = ?, fields = ?, tags = ? WHERE id = ?")
    .run(contact.name, JSON.stringify(contact.fields), JSON.stringify(contact.tags), contact.id);
}

// ---------- flows ----------

function rowToFlow(r: Row): Flow {
  return {
    id: r.id as string,
    name: r.name as string,
    graph: JSON.parse(r.graph as string),
    triggers: JSON.parse(r.triggers as string),
    updatedAt: r.updatedAt as string,
  };
}

export function listFlows(): Flow[] {
  return (getDb().prepare("SELECT * FROM flows ORDER BY updatedAt DESC").all() as Row[]).map(
    rowToFlow,
  );
}

export function getFlow(id: string): Flow | null {
  const r = getDb().prepare("SELECT * FROM flows WHERE id = ?").get(id) as Row | undefined;
  return r ? rowToFlow(r) : null;
}

export function saveFlow(flow: Flow): Flow {
  const updated: Flow = { ...flow, updatedAt: now() };
  getDb()
    .prepare(
      `INSERT INTO flows (id, name, graph, triggers, updatedAt) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, graph=excluded.graph,
         triggers=excluded.triggers, updatedAt=excluded.updatedAt`,
    )
    .run(
      updated.id,
      updated.name,
      JSON.stringify(updated.graph),
      JSON.stringify(updated.triggers),
      updated.updatedAt,
    );
  return updated;
}

export function deleteFlow(id: string): void {
  getDb().prepare("DELETE FROM flows WHERE id = ?").run(id);
}

// ---------- conversations ----------

function rowToConversation(r: Row): Conversation {
  return {
    id: r.id as string,
    contactId: r.contactId as string,
    status: r.status as Conversation["status"],
    state: r.state ? (JSON.parse(r.state as string) as FlowState) : null,
    updatedAt: r.updatedAt as string,
  };
}

export function listConversations(): Conversation[] {
  return (
    getDb().prepare("SELECT * FROM conversations ORDER BY updatedAt DESC").all() as Row[]
  ).map(rowToConversation);
}

export function getOrCreateConversation(contactId: string): Conversation {
  const r = getDb()
    .prepare("SELECT * FROM conversations WHERE contactId = ?")
    .get(contactId) as Row | undefined;
  if (r) return rowToConversation(r);
  const conv: Conversation = {
    id: newId("cv"),
    contactId,
    status: "bot",
    state: null,
    updatedAt: now(),
  };
  getDb()
    .prepare("INSERT INTO conversations (id, contactId, status, state, updatedAt) VALUES (?, ?, 'bot', NULL, ?)")
    .run(conv.id, conv.contactId, conv.updatedAt);
  return conv;
}

export function getConversation(id: string): Conversation | null {
  const r = getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(id) as Row | undefined;
  return r ? rowToConversation(r) : null;
}

export function saveConversation(conv: Conversation): void {
  getDb()
    .prepare("UPDATE conversations SET status = ?, state = ?, updatedAt = ? WHERE id = ?")
    .run(conv.status, conv.state ? JSON.stringify(conv.state) : null, now(), conv.id);
}

// ---------- messages ----------

function rowToMessage(r: Row): ChatMessage {
  return {
    id: r.id as string,
    conversationId: r.conversationId as string,
    sender: r.sender as ChatMessage["sender"],
    text: r.text as string,
    buttons: r.buttons ? (JSON.parse(r.buttons as string) as QuickReplyButton[]) : null,
    createdAt: r.createdAt as string,
  };
}

export function listMessages(conversationId: string): ChatMessage[] {
  return (
    getDb()
      .prepare("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC, rowid ASC")
      .all(conversationId) as Row[]
  ).map(rowToMessage);
}

export function appendMessage(
  conversationId: string,
  sender: ChatMessage["sender"],
  text: string,
  buttons: QuickReplyButton[] | null = null,
): ChatMessage {
  const msg: ChatMessage = {
    id: newId("ms"),
    conversationId,
    sender,
    text,
    buttons,
    createdAt: now(),
  };
  getDb()
    .prepare(
      "INSERT INTO messages (id, conversationId, sender, text, buttons, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(msg.id, msg.conversationId, msg.sender, msg.text, buttons ? JSON.stringify(buttons) : null, msg.createdAt);
  getDb().prepare("UPDATE conversations SET updatedAt = ? WHERE id = ?").run(msg.createdAt, conversationId);
  return msg;
}

// ---------- stats ----------

export function getStats() {
  const db = getDb();
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    contacts: count("SELECT COUNT(*) AS n FROM contacts"),
    flows: count("SELECT COUNT(*) AS n FROM flows"),
    conversations: count("SELECT COUNT(*) AS n FROM conversations"),
    messagesOut: count("SELECT COUNT(*) AS n FROM messages WHERE sender IN ('bot','agent')"),
    messagesIn: count("SELECT COUNT(*) AS n FROM messages WHERE sender = 'contact'"),
  };
}
