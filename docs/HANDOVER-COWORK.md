# Handover: CHAT3X Control Panel in Claude Cowork aktivieren

> Für eine Claude-Session (Cowork/Desktop), die das CHAT3X Live-Control-Panel rendern und bedienen soll. Selbsterklärend — kein weiterer Kontext nötig.

## Kontext

CHAT3X ist eine lokale ManyChat-Alternative (Chat-Automation: Trigger → Flow → Action). Alles läuft auf dem Rechner des Users:

- **Projektpfad:** `~/02_vent3x/CHAT3X`
- **Server:** Next.js auf `http://localhost:3000`
- **Daten:** SQLite unter `data/chat3x.db` (löschen = Reset, Seeds werden neu angelegt)
- **Vollständige API-Referenz:** `.claude/skills/chat3x/SKILL.md` im Projekt

## Schritt 1 — Server sicherstellen

```bash
curl -s http://localhost:3000/api/stats
```

Antwortet er nicht: im Projektordner `npm run dev` starten (im Hintergrund), dann Health-Check wiederholen. Erststart braucht `npm install`.

## Schritt 2 — Live-Daten holen

Drei GET-Requests, Ergebnisse als ein JSON-Objekt zusammenfassen:

```json
{ "stats": GET /api/stats, "contacts": GET /api/contacts, "conversations": GET /api/conversations }
```

## Schritt 3 — Panel rendern

1. Template lesen: `.claude/skills/chat3x/assets/control-widget.html`
2. Den Platzhalter `__CHAT3X_DATA__` durch das JSON-Objekt aus Schritt 2 ersetzen (ein einziges Vorkommen).
3. Rendern — je nach verfügbaren Tools:
   - **Widget-/Visualize-Tool vorhanden** (z. B. `show_widget`): HTML direkt übergeben. Vorher ggf. das zugehörige `read_me` laden.
   - **Nur klassische Artefakte:** HTML als Artefakt ausgeben. Hinweis: `sendPrompt()` existiert dort nicht — das Panel ist dann ein Snapshot; Aktionen laufen über Chat-Anweisungen (siehe Schritt 4).

## Schritt 4 — Interaktion verstehen

Das Widget arbeitet zweistufig:

1. **Direkter Fetch** auf `http://localhost:3000` — CORS ist serverseitig offen (`src/proxy.ts`). Erlaubt die Sandbox das, ist das Panel voll live (Senden, Kontakt anlegen, Refresh).
2. **Fallback `sendPrompt()`**: Blockt die Sandbox den Fetch, schicken die Buttons eine Anweisung in den Chat, z. B. *„Nutze den chat3x Skill: sende als Kontakt Grace Hopper (ct_grace) die Nachricht ‚prices'…"*. Diese Anweisungen ausführen und danach das Panel mit frischen Daten neu rendern (Schritt 2 + 3).

## Mini-API (für Aktionen ohne Skill-Datei)

Alle Bodies JSON, Header `Content-Type: application/json`. Fehler: non-2xx mit `{"error":"..."}`.

| Aktion | Request |
|---|---|
| Nachricht als Kontakt | `POST /api/inbound` `{"contactId":"ct_x","text":"..."}` → `{conversationId, messages[]}` |
| Neuer Kontakt (Welcome-Flow) | `POST /api/inbound` `{"name":"..."}` |
| Thread lesen (auch für verzögerte Bot-Antworten) | `GET /api/conversations/{id}` |
| Takeover / zurück an Bot | `PATCH /api/conversations/{id}` `{"status":"human"}` bzw. `{"status":"bot"}` |
| Als Mensch antworten | `PATCH /api/conversations/{id}` `{"agentMessage":"..."}` |

Wichtig: Flows mit Delay- oder AI-Nodes antworten teils **asynchron** — nach dem POST den Thread nach ein paar Sekunden erneut abrufen.

## Troubleshooting

- **Port 3000 belegt:** anderer Prozess läuft dort — prüfen mit `lsof -i :3000`; CHAT3X bevorzugt weiterverwenden statt doppelt zu starten.
- **AI-Node antwortet nur mit Fallback-Text:** Ollama läuft nicht (`ollama serve`, Modell `llama3.2`) — kein Fehler, gewolltes Verhalten.
- **Panel zeigt alte Zahlen:** Es ist ein Snapshot vom Renderzeitpunkt — neu rendern (Schritt 2 + 3) oder „Aktualisieren"-Button nutzen.
