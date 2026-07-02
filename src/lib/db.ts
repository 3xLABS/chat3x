// SQLite persistence layer — a single local file, no cloud services.
// Uses better-sqlite3 (synchronous, ideal for a single-user local app).
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "chat3x.db");

// Survive Next.js dev-server hot reloads by stashing the handle globally
const globalForDb = globalThis as unknown as { chat3xDb?: Database.Database };

function createDb(): Database.Database {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fields TEXT NOT NULL DEFAULT '{}',
      tags TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS flows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      graph TEXT NOT NULL,
      triggers TEXT NOT NULL DEFAULT '[]',
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      contactId TEXT NOT NULL REFERENCES contacts(id),
      status TEXT NOT NULL DEFAULT 'bot',
      state TEXT,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL REFERENCES conversations(id),
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      buttons TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversationId, createdAt);
  `);
  const isEmpty =
    (db.prepare("SELECT COUNT(*) AS n FROM flows").get() as { n: number }).n === 0;
  if (isEmpty) seedDatabase(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.chat3xDb) globalForDb.chat3xDb = createDb();
  return globalForDb.chat3xDb;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function now(): string {
  return new Date().toISOString();
}
