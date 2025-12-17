"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type SearchMode = "cached" | "warm";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export default function GameSearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Game[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [activeMode, setActiveMode] = useState<SearchMode>("cached");
  const [isLoading, setIsLoading] = useState(false);
  const [isWarmLoading, setIsWarmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inflight = useRef<AbortController | null>(null);

  const startSearch = useCallback(
    async (term: string, mode: SearchMode, { reset, cursor }: { reset: boolean; cursor?: string }) => {
      if (!term) return;

      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;

      if (reset) {
        setResults([]);
        setNextCursor(undefined);
      }

      setError(null);
      setIsLoading(true);

      try {
        const data = await requestSearch(term, mode, cursor, controller.signal);
        setHasSearched(true);
        setActiveMode(mode);
        setResults((prev) => (reset ? data.items : [...prev, ...data.items]));
        setNextCursor(data.nextCursor);
      } catch (err) {
        if (controller.signal.aborted) return;
        setHasSearched(true);
        setError(err instanceof Error ? err.message : "Failed to fetch results.");
      } finally {
        setIsLoading(false);
        setIsWarmLoading(false);
        if (inflight.current === controller) {
          inflight.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => {
    const term = debouncedQuery.trim();

    if (!term) {
      setResults([]);
      setNextCursor(undefined);
      setHasSearched(false);
      setError(null);
      return;
    }

    setSearchTerm(term);
    startSearch(term, "cached", { reset: true });
  }, [debouncedQuery, startSearch]);

  const isWarmActive = activeMode === "warm";
  const hasMore = !!nextCursor;

  const headingSubtitle = useMemo(() => {
    if (!hasSearched) return "Find games, franchises, or creators. Cached search keeps it fast; warm search fans out to Steam and populates the cache.";
    if (isWarmActive) return "Warm search pulled fresh data and cached it. Add to boards once that feature lands.";
    return "Cached search returns what we already know. Use 'Search wider' to fetch new titles from Steam.";
  }, [hasSearched, isWarmActive]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 md:px-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-200">
            Collection Tools
          </p>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Search the library without leaving your flow.
          </h1>
          <p className="text-base text-indigo-100/80 md:text-lg">{headingSubtitle}</p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-900/20 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for a title, genre, or publisher..."
              className="bg-white/5 text-white placeholder:text-indigo-100/60"
              autoFocus
            />
            <div className="flex gap-2 md:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || !query.trim()}
                onClick={() => {
                  const term = query.trim();
                  if (!term) return;
                  setSearchTerm(term);
                  startSearch(term, "cached", { reset: true });
                }}
              >
                Refresh cached
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={isWarmLoading || isLoading || !query.trim()}
                onClick={() => {
                  const term = query.trim() || searchTerm;
                  if (!term) return;
                  setSearchTerm(term);
                  setIsWarmLoading(true);
                  startSearch(term, "warm", { reset: true });
                }}
              >
                {isWarmLoading ? "Warming..." : "Search wider"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {!hasSearched && !isLoading ? (
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-indigo-50/80">
                Start typing to search cached results. Hit "Search wider" to ping Steam and refresh the cache.
              </div>
            ) : null}

            {isLoading && results.length === 0 ? (
              <LoadingGrid />
            ) : (
              <ResultGrid games={results} />
            )}

            {!isLoading && results.length === 0 && hasSearched ? (
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-indigo-50/80">
                No matches yet. Try broadening your query or run a warm search to pull fresh data.
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-indigo-100/60">
                Mode: <span className="font-semibold">{activeMode === "warm" ? "Warm (live + cache)" : "Cached only"}</span>
              </div>
              {hasMore ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => startSearch(searchTerm, activeMode, { cursor: nextCursor, reset: false })}
                >
                  {isLoading ? "Loading..." : "Load more"}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultGrid({ games }: { games: Game[] }) {
  if (!games.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {games.map((game) => (
        <article
          key={game.id}
          className="group rounded-xl border border-white/5 bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-indigo-900/40 p-4 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-indigo-500/30"
        >
          <div className="flex gap-3">
            <CoverImage url={game.coverUrl ?? game.headerImageUrl ?? game.backgroundImageUrl} title={game.title} />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold leading-tight text-white">{game.title}</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100/80">
                  {game.source}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-indigo-100/80">
                {game.description || "No description available."}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-indigo-100/70">
                {renderMeta(game.platforms, "platform")}
                {renderMeta(game.genres, "genre")}
                {renderMeta(game.publishers, "publisher")}
              </div>
              {game.releaseDate ? (
                <p className="text-xs text-indigo-100/60">
                  Released {formatDate(game.releaseDate)} {game.metacritic ? `- Metacritic ${game.metacritic}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CoverImage({ url, title }: { url?: string; title: string }) {
  if (!url) {
    return (
      <div className="flex size-20 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-indigo-100/60">
        No art
      </div>
    );
  }

  return (
    <div className="relative size-20 overflow-hidden rounded-lg border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={title}
        className="size-full object-cover transition duration-500 group-hover:scale-[1.02]"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function renderMeta(values: string[] = [], keyPrefix: string) {
  return values.slice(0, 3).map((value, index) => (
    <span
      key={`${keyPrefix}-${index}`}
      className="rounded-full bg-white/10 px-2 py-1 font-semibold uppercase tracking-wide text-indigo-100/70"
    >
      {value}
    </span>
  ));
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/5 bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-indigo-900/40 p-4"
        >
          <div className="flex gap-3">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

async function requestSearch(
  term: string,
  mode: SearchMode,
  cursor: string | undefined,
  signal: AbortSignal | undefined,
) {
  const params = new URLSearchParams({
    q: term,
    limit: String(PAGE_SIZE),
    mode,
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`/api/games/search?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  let payload: ApiResult<PaginatedResult<Game>> | null = null;
  try {
    payload = (await response.json()) as ApiResult<PaginatedResult<Game>>;
  } catch {
    // ignore parse failure; handled below
  }

  if (!payload || !payload.success || !payload.data) {
    const reason =
      payload?.error ??
      (response.ok ? "Unexpected response from server." : `Request failed (${response.status}).`);
    throw new Error(reason);
  }

  return payload.data;
}

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
