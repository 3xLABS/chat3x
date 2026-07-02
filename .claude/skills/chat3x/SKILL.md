---
name: chat3x
description: Use when the user wants to control, inspect, or test CHAT3X (the local chat automation app) from Claude — send test messages as a contact, create/edit/list flows, read the inbox or contacts, check stats, take over a conversation, or show the live control panel. Triggers include "chat3x", "steuere chat3x", "control panel", "send test message", "zeig die inbox", "erstell einen Flow".
---

# CHAT3X Control

## Overview

CHAT3X is a local ManyChat-style automation app in this repo. Everything runs on `http://localhost:3000`; data is SQLite at `data/chat3x.db`. You control it entirely through its HTTP API.

**Ensure the server is running first:** `curl -s http://localhost:3000/api/stats` — if it fails, start it with the preview tool (config `chat3x-dev` in `.claude/launch.json`) or `npm run dev`.

## API quick reference

Base URL `http://localhost:3000`. All bodies are JSON — always send `Content-Type: application/json`. Errors return non-2xx with `{"error":"..."}` (e.g. unknown contactId → 400). CORS is open (see `src/proxy.ts`).

| Action | Call |
|---|---|
| Stats | `GET /api/stats` |
| New contact (runs welcome flow) | `POST /api/inbound` `{"name":"Ada"}` |
| Send message as contact | `POST /api/inbound` `{"contactId":"ct_x","text":"prices"}` → `{conversationId, messages[]}` — all messages created now, incl. synchronous bot replies; use `conversationId` to poll for delayed ones |
| List contacts | `GET /api/contacts` → array of `{id, name, fields{}, tags[], createdAt}` |
| List flows | `GET /api/flows` |
| Create flow | `POST /api/flows` `{"name":"My Flow"}` |
| Read/update/delete flow | `GET/PUT/DELETE /api/flows/{id}` — PUT accepts `{name, graph, triggers}` |
| Inbox list | `GET /api/conversations` (joined with contact + last message) |
| Thread | `GET /api/conversations/{id}` |
| Human takeover / hand back | `PATCH /api/conversations/{id}` `{"status":"human"}` or `{"status":"bot"}` |
| Reply as human agent | `PATCH /api/conversations/{id}` `{"agentMessage":"..."}` |

## Flow graph shape (for PUT /api/flows/{id})

```jsonc
{
  "entryId": "n1",
  "nodes": [{ "id": "n1", "type": "message", "position": {"x":0,"y":0},
              "data": { "text": "Hi {{name}}", "buttons": [{"id":"b1","label":"Go"}] } }],
  "edges": [{ "id": "e1", "source": "n1", "target": "n2", "sourceHandle": "b1" }]
}
```

- Node types + data: `message {text, buttons[]}`, `condition {field, op, value}` (edges via sourceHandle `yes`/`no`), `action {kind: add_tag|remove_tag|set_field, tag?, fieldKey?, fieldValue?}`, `delay {seconds}`, `user_input {question, fieldKey}`, `ai {systemPrompt, fallbackText}`, `start_flow {flowId}`.
- Message buttons route via `sourceHandle` = button id. Text supports `{{name}}` and `{{field:key}}`.
- Triggers: `{id, type: keyword|new_contact|default_reply, keyword?, match: is|begins_with|contains, enabled}`.

## Live control panel (artifact)

To show the interactive control panel: fetch live data, inject it into the template, render with the `show_widget` tool (call `read_me` first if not done this session).

1. Build the data snapshot: `stats` (GET /api/stats), `contacts` (GET /api/contacts), `conversations` (GET /api/conversations).
2. Read `assets/control-widget.html` (in this skill directory).
3. Replace the single placeholder `__CHAT3X_DATA__` with the JSON object `{stats, contacts, conversations}`.
4. Call `show_widget` with the result.

The widget tries direct `fetch` to localhost (works if the sandbox allows it) and falls back to `sendPrompt()` — those prompts arrive as user messages; execute them with this skill and re-render the panel with fresh data.

## Common mistakes

- **Bot replies to delays/AI arrive async** — after `POST /api/inbound`, if a flow has a delay node, poll `GET /api/conversations/{id}` again after the delay.
- **Quick replies resume by label**: to "tap" a button, send its label text via `/api/inbound` (case-insensitive match).
- **Waiting state**: a conversation with `state != null` is paused at buttons/user_input — the next inbound message resumes it instead of matching triggers.
- **status "human"** disables all automation until set back to `"bot"`.
