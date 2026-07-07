import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClientOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  lastVisitAt?: string | null;
}

interface ClientSearchPanelProps {
  clients: ClientOption[];
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  onAddNew?: (searchText: string) => void;
  placeholder?: string;
}

const digits = (s?: string | null) => (s ? s.replace(/\D/g, "") : "");

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientSearchPanel({
  clients,
  value,
  onValueChange,
  isLoading,
  onAddNew,
  placeholder = "Search by name, phone, or email…",
}: ClientSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const qDigits = digits(q);
    return clients.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.email && c.email.toLowerCase().includes(q)) return true;
      if (qDigits && c.phone && digits(c.phone).includes(qDigits)) return true;
      return false;
    });
  }, [clients, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const recents = useMemo(
    () =>
      clients
        .filter((c) => !!c.lastVisitAt)
        .sort((a, b) => (b.lastVisitAt || "").localeCompare(a.lastVisitAt || ""))
        .slice(0, 3),
    [clients]
  );
  const trimmed = query.trim();
  const exactMatch = filtered.some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  const showAddNew = !!onAddNew && trimmed.length > 0 && !exactMatch;

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) onValueChange(pick.id);
      else if (showAddNew && onAddNew) onAddNew(trimmed);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recent chips when empty */}
      {!query && recents.length > 0 && !isLoading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mr-1">
            Recent
          </span>
          {recents.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onValueChange(c.id)}
              className="px-3 py-1.5 border border-foreground/15 text-xs font-medium hover:border-foreground hover:bg-foreground/5 transition-colors"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full bg-background/60 border border-foreground/20 px-4 py-4 pr-12 text-lg focus:outline-none focus:border-foreground focus-visible:ring-inset placeholder:text-muted-foreground/60 transition-colors"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 pointer-events-none" />
      </div>

      {/* Results list */}
      <div className="border border-foreground/10 bg-background/40 max-h-[28rem] overflow-y-auto">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center px-6">
            <p className="text-sm text-muted-foreground mb-4">
              No clients match "{trimmed}".
            </p>
            {showAddNew && (
              <button
                type="button"
                onClick={() => onAddNew?.(trimmed)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-[0.18em] hover:bg-foreground/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add "{trimmed}" as new client
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {filtered.map((c, i) => {
              const isSelected = value === c.id;
              const isHighlighted = i === highlight;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => onValueChange(c.id)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      isHighlighted && "bg-foreground/5",
                      isSelected && "bg-foreground/5"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-foreground" />
                    )}
                    <span className="w-9 h-9 rounded-full border border-foreground/20 bg-card flex items-center justify-center shrink-0">
                      {initials(c.name) ? (
                        <span className="text-[11px] font-bold tracking-wider text-foreground">
                          {initials(c.name)}
                        </span>
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {c.name}
                      </span>
                      {(c.email || c.phone) && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer add-new action */}
      {onAddNew && (
        <button
          type="button"
          onClick={() => onAddNew(trimmed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-foreground/25 text-xs font-bold uppercase tracking-[0.2em] text-foreground/70 hover:text-foreground hover:border-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Client
        </button>
      )}
    </div>
  );
}
