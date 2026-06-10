"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, DoorOpen, FileText, Loader2, ReceiptText, Search, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  globalSearchAction,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from "@/app/actions/search";
import { cn } from "@/lib/utils";

const TYPE_META: Record<GlobalSearchResultType, { label: string; icon: LucideIcon }> = {
  property: { label: "Properties", icon: Building2 },
  unit: { label: "Units", icon: DoorOpen },
  tenant: { label: "Tenants", icon: User },
  document: { label: "Documents", icon: FileText },
  statement: { label: "Statements", icon: ReceiptText },
};

const TYPE_ORDER: GlobalSearchResultType[] = [
  "property",
  "unit",
  "tenant",
  "document",
  "statement",
];

type GlobalSearchProps = {
  /** Register the ⌘K / Ctrl+K shortcut. Disable on duplicate mounts (e.g. mobile header). */
  enableHotkey?: boolean;
  variant?: "sidebar" | "icon";
};

export function GlobalSearch({ enableHotkey = true, variant = "sidebar" }: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    if (!enableHotkey) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enableHotkey]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const found = await globalSearchAction(q);
        if (requestIdRef.current === requestId) {
          setResults(found);
          setActiveIndex(0);
        }
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const sorted = TYPE_ORDER.flatMap((type) => results.filter((r) => r.type === type));

  function navigateTo(result: GlobalSearchResult) {
    close();
    router.push(result.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, sorted.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = sorted[activeIndex];
      if (result) navigateTo(result);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  let renderedGroupHeader: GlobalSearchResultType | null = null;

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface-muted/60 px-3 py-2 text-sm text-muted transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 p-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
        >
          <div className="motion-pop w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-3 border-b border-border px-4">
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search properties, tenants, documents, statements…"
                className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                aria-label="Search"
              />
              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted">
                esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {query.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  Type at least 2 characters to search your portfolio.
                </p>
              ) : sorted.length === 0 && !loading ? (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  No results for &ldquo;{query.trim()}&rdquo;.
                </p>
              ) : (
                <ul>
                  {sorted.map((result, index) => {
                    const meta = TYPE_META[result.type];
                    const Icon = meta.icon;
                    const showHeader = renderedGroupHeader !== result.type;
                    renderedGroupHeader = result.type;
                    return (
                      <li key={`${result.type}-${result.id}`}>
                        {showHeader && (
                          <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted first:pt-1">
                            {meta.label}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => navigateTo(result)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            index === activeIndex
                              ? "bg-primary-muted text-foreground"
                              : "text-muted-foreground hover:bg-surface-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-foreground">
                              {result.title}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {result.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
