"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { GameResultsGrid, GameResultsLoadingGrid } from "@/components/games/search/GameResultsGrid";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { fetchGames } from "@/lib/client/games";
import type { Game } from "@/lib/types/game";

const PAGE_SIZE = 24;

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastRequestedCursor = useRef<string | undefined>(undefined);

  const loadPage = async (cursor?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchGames({ limit: PAGE_SIZE, cursor });
      setGames((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load games.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (!nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!nextCursor) return;
        if (isLoading) return;
        if (lastRequestedCursor.current === nextCursor) return;

        lastRequestedCursor.current = nextCursor;
        loadPage(nextCursor);
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, nextCursor]);

  return (
    <AppShell
      title="Games index"
      description="Reads from /api/games to show the cached catalog with cursor-based pagination."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={() => loadPage()}
          disabled={isLoading}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {isLoading && games.length === 0 ? (
          <GameResultsLoadingGrid />
        ) : (
          <GameResultsGrid games={games} />
        )}

        {nextCursor ? (
          <div ref={sentinelRef} className="mt-6 h-1 w-full" aria-hidden="true" />
        ) : null}

        {isLoading && games.length > 0 ? <GameResultsLoadingGrid /> : null}

        {!isLoading && games.length === 0 && !error ? (
          <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-6 text-sm text-indigo-50/80">
            No games returned yet. Add data to Argus or try refreshing.
          </div>
        ) : null}

        {!isLoading && !nextCursor && games.length > 0 ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-indigo-100/70">
            <span className="inline-flex size-2 rounded-full bg-emerald-400" aria-hidden />
            <span>End of catalog (no nextCursor).</span>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
