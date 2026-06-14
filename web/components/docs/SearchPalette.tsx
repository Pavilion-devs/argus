"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { flatDocs } from "@/lib/docs-nav";

/** ⌘K command palette that filters and jumps across doc pages. */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return flatDocs;
    return flatDocs.filter((d) =>
      `${d.title} ${d.summary} ${d.group}`.toLowerCase().includes(term),
    );
  }, [q]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("argus:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("argus:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const go = (slug: string) => {
    setOpen(false);
    router.push(slug);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#141417]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Icon icon="solar:magnifer-linear" className="h-4 w-4 text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search the docs..."
            className="w-full bg-transparent py-3.5 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
          />
          <kbd className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-700">
            ESC
          </kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-zinc-400">
              No results for &ldquo;{q}&rdquo;.
            </li>
          )}
          {results.map((d, i) => (
            <li key={d.slug}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d.slug)}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  i === active ? "bg-blue-500/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wide text-zinc-400">{d.group}</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{d.title}</span>
                <span className="line-clamp-1 text-[12px] text-zinc-500">{d.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
