"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDebounce } from "@/components/hooks/useDebounce";
import {
  GameResultsGrid,
  GameResultsLoadingGrid,
} from "@/components/games/search/GameResultsGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestGameSearch } from "@/lib/client/game-search";
import type { Game } from "@/lib/types/game";

const INITIAL_PAGE_SIZE = 50;
const MORE_PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

export default function GameSearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Game[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inflight = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastRequestedCursor = useRef<string | undefined>(undefined);

  const startSearch = useCallback(
    async (term: string, { reset, cursor }: { reset: boolean; cursor?: string }) => {
      if (!term) return;

      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;

      if (reset) {
        setResults([]);
        setNextCursor(undefined);
        lastRequestedCursor.current = undefined;
      }

      setError(null);
      setIsLoading(true);

      try {
        const data = await requestGameSearch({
          term,
          limit: reset ? INITIAL_PAGE_SIZE : MORE_PAGE_SIZE,
          cursor,
          signal: controller.signal,
        });
        setHasSearched(true);
        setResults((prev) => (reset ? data.items : [...prev, ...data.items]));
        setNextCursor(data.nextCursor);
      } catch (err) {
        if (controller.signal.aborted) return;
        setHasSearched(true);
        setError(err instanceof Error ? err.message : "Failed to fetch results.");
      } finally {
        setIsLoading(false);
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
    startSearch(term, { reset: true });
  }, [debouncedQuery, startSearch]);

  const hasMore = !!nextCursor;
  const isLoadingMore = isLoading && results.length > 0;

  const headingSubtitle = useMemo(() => {
    if (!hasSearched) {
      return "Find games, franchises, or creators. Results come from the GoodGame backend.";
    }
    return "Search results are pulled from the GoodGame backend.";
  }, [hasSearched]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (!searchTerm) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (isLoading) return;
        if (!nextCursor) return;
        if (lastRequestedCursor.current === nextCursor) return;

        lastRequestedCursor.current = nextCursor;
        startSearch(searchTerm, { cursor: nextCursor, reset: false });
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, nextCursor, searchTerm, startSearch]);

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
                className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                disabled={isLoading || !query.trim()}
                onClick={() => {
                  const term = query.trim();
                  if (!term) return;
                  setSearchTerm(term);
                  startSearch(term, { reset: true });
                }}
              >
                Refresh
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
                Start typing to search games via the GoodGame backend.
              </div>
            ) : null}

            {isLoading && results.length === 0 ? (
              <GameResultsLoadingGrid />
            ) : (
              <GameResultsGrid games={results} />
            )}

            {isLoadingMore ? <GameResultsLoadingGrid /> : null}

            {!isLoading && results.length === 0 && hasSearched ? (
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-indigo-50/80">
                No matches yet. Try broadening your query.
              </div>
            ) : null}

            {hasMore ? <div ref={sentinelRef} className="h-1 w-full" /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
