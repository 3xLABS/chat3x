"use client";

import { useEffect, useState } from "react";
import type { Contact } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    fetch("/api/contacts").then((r) => r.json()).then(setContacts).catch(() => setContacts([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">audience</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Contacts</h1>
      </header>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Tags</th>
              <th className="px-5 py-3 font-medium">Fields</th>
              <th className="px-5 py-3 font-medium">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {contacts.map((contact) => (
              <tr key={contact.id} className="transition-colors hover:bg-surface-2">
                <td className="px-5 py-3 font-medium">{contact.name}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-accent/40 px-2 py-0.5 font-mono text-[10px] text-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-dim">
                  {Object.entries(contact.fields)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("  ") || "—"}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-faint">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-faint">
                  No contacts yet — start a conversation in the Inbox.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
