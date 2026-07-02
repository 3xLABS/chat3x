"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  glyph: string; // simple mono glyphs keep the console aesthetic without an icon lib
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", glyph: "◧" },
  { href: "/flows", label: "Flows", glyph: "⌘" },
  { href: "/inbox", label: "Inbox", glyph: "▤" },
  { href: "/contacts", label: "Contacts", glyph: "◉" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-accent font-mono text-sm font-bold text-accent-ink">
          3x
        </span>
        <div>
          <p className="font-mono text-sm font-semibold tracking-widest">CHAT3X</p>
          <p className="text-[10px] uppercase tracking-wider text-ink-faint">local automation</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-surface-2 text-accent"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="font-mono text-base leading-none">{item.glyph}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          ● runs on this machine
        </p>
      </div>
    </aside>
  );
}
