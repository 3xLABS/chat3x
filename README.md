# CHAT3X

Private, local-first chat marketing automation — a ManyChat-style engine that runs entirely on your machine. No cloud, no Meta app review, no data leaving your computer.

## Model

`Trigger → Flow → Action` (same mental model as ManyChat):

- **Triggers**: keyword (`is` / `begins with` / `contains`), new contact, default reply
- **Flow nodes**: Message (+ quick replies), Condition (fields/tags), Action (tag/field), Smart Delay, User Input, AI Step (local Ollama), Start Flow
- **Audience**: contacts with tags + custom fields, `{{name}}` / `{{field:key}}` interpolation
- **Inbox**: live chat with human takeover; doubles as the local channel simulator

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine unit tests (vitest)
npm run build      # production build
```

Data lives in `data/chat3x.db` (SQLite, WAL). Delete the file to reset — seed flows and demo contacts are recreated on next boot.

### Optional: local AI replies

The AI Step node uses Ollama's OpenAI-compatible endpoint. Without Ollama the node falls back to its configured fallback text.

```bash
ollama serve && ollama pull llama3.2
# override via env: OLLAMA_BASE_URL, OLLAMA_MODEL
```

## Architecture

- `src/lib/engine/` — pure flow engine (no I/O, dependency-injected AI), fully unit-tested
- `src/lib/runtime.ts` — impure layer: trigger matching, output persistence, delay scheduling
- `src/lib/repo.ts` + `db.ts` — SQLite repository layer (better-sqlite3)
- `src/app/api/` — local channel webhook (`/api/inbound`) + CRUD routes
- `src/components/builder/` — React Flow visual builder

Channel adapters (Telegram long-polling, Meta APIs) can plug into `handleInbound()` — the engine is channel-agnostic.
