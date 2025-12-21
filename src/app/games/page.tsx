"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { RefreshCcw } from "lucide-react";

import { GameResultsGrid, GameResultsLoadingGrid } from "@/components/games/search/GameResultsGrid";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { fetchBoards, fetchBoardGames } from "@/lib/client/boards";
import { fetchGames } from "@/lib/client/games";
import type { Game } from "@/lib/types/game";

const PAGE_SIZE = 24;

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<
    Record<string, Array<{ id: string; name: string; status?: string }>>
  >({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastRequestedCursor = useRef<string | undefined>(undefined);
  const { isSignedIn } = useAuth();

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
    if (!isSignedIn) {
      setMemberships({});
      return;
    }

    const gameIds = Array.from(new Set(games.map((game) => game.id)));
    if (gameIds.length === 0) return;

    const gameIdSet = new Set(gameIds);
    let cancelled = false;

    const loadMemberships = async () => {
      try {
        const membershipMap: Record<string, Array<{ id: string; name: string; status?: string }>> = {};
        let cursor: string | undefined;
        const boards = [];

        do {
          const page = await fetchBoards({ limit: 50, cursor });
          boards.push(...page.items);
          cursor = page.nextCursor;
        } while (cursor);

        for (const board of boards) {
          let bgCursor: string | undefined;
          do {
            const page = await fetchBoardGames({ boardId: board.id, limit: 50, cursor: bgCursor });
            for (const item of page.items) {
              const gameId = (item as { gameId?: string }).gameId ?? item.game?.id;
              if (!gameId || !gameIdSet.has(gameId)) continue;
              const list = membershipMap[gameId] ?? [];
              if (!list.some((entry) => entry.id === board.id)) {
                list.push({ id: board.id, name: board.name, status: item.status });
              }
              membershipMap[gameId] = list;
            }
            bgCursor = page.nextCursor;
          } while (bgCursor);
        }

        if (!cancelled) {
          setMemberships(membershipMap);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to load board memberships; buttons will default to Add state.", err);
        }
      }
    };

    void loadMemberships();

    return () => {
      cancelled = true;
    };
  }, [games, isSignedIn]);

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
          <GameResultsGrid games={games} memberships={memberships} />
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
