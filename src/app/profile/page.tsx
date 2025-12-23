"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { Gamepad2, Loader2, RefreshCcw } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { fetchBoardGames, fetchBoards } from "@/lib/client/boards";
import { igdbImage } from "@/lib/igdbImage";
import type { Board } from "@/lib/types/board";
import type { BoardGameWithGame } from "@/lib/types/board-game";

export default function ProfilePage() {
  const { isLoaded, user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardGameCounts, setBoardGameCounts] = useState<Record<string, number>>({});
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const boardsFetchToken = useRef(0);

  const publicBoards = useMemo(() => boards.filter((board) => board.isPublic), [boards]);

  const handleRefresh = async () => {
    if (!user) return;
    setError(null);
    setIsRefreshing(true);
    try {
      await user.reload();
      await loadBoards();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh user.";
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadBoards = useCallback(async () => {
    if (!user) return;
    const token = ++boardsFetchToken.current;
    setBoardsLoading(true);
    setBoardsError(null);
    setLibraryCount(null);
    try {
      const collected: Board[] = [];
      let cursor: string | undefined;

      do {
        const page = await fetchBoards({ limit: 50, cursor });
        if (boardsFetchToken.current !== token) return;
        collected.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      if (boardsFetchToken.current !== token) return;
      setBoards(collected);

      const createLimiter = (maxConcurrent: number) => {
        const queue: Array<() => void> = [];
        let active = 0;

        const runNext = () => {
          if (active >= maxConcurrent) return;
          const nextTask = queue.shift();
          if (!nextTask) return;
          active++;
          nextTask();
        };

        return function <T>(fn: () => Promise<T>): Promise<T> {
          return new Promise<T>((resolve, reject) => {
            const run = () => {
              fn()
                .then(resolve)
                .catch(reject)
                .finally(() => {
                  active--;
                  runNext();
                });
            };

            if (active < maxConcurrent) {
              active++;
              run();
            } else {
              queue.push(run);
            }
          });
        };
      };

      const limiter = createLimiter(5);
      const boardCountResults = await Promise.all(
        collected.map((board) =>
          limiter(async () => {
            let boardCursor: string | undefined;
            let boardCount = 0;
            do {
              if (boardsFetchToken.current !== token) return null;
              const page = await fetchBoardGames({ boardId: board.id, limit: 50, cursor: boardCursor });
              if (boardsFetchToken.current !== token) return null;
              boardCount += page.items.length;
              boardCursor = page.nextCursor ?? undefined;
            } while (boardCursor);

            const normalizedName = board.name.trim().toLowerCase();
            return {
              boardId: board.id,
              count: boardCount,
              isLibrary: normalizedName === "library",
            };
          }),
        ),
      );

      if (boardsFetchToken.current !== token) return;

      const counts: Record<string, number> = {};
      let libraryCountLocal: number | null = null;

      for (const result of boardCountResults) {
        if (!result) continue;
        counts[result.boardId] = result.count;
        if (result.isLibrary) {
          libraryCountLocal = result.count;
        }
      }

      setBoardGameCounts(counts);
      setLibraryCount(libraryCountLocal);
    } catch (err) {
      if (boardsFetchToken.current !== token) return;
      const message = err instanceof Error ? err.message : "Failed to load boards.";
      setBoardsError(message);
    } finally {
      if (boardsFetchToken.current === token) {
        setBoardsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const email = user?.primaryEmailAddress?.emailAddress ?? "-";
  const name = user?.fullName ?? user?.username ?? "-";
  const created = user?.createdAt ? formatDate(user.createdAt) : "-";
  const location =
    typeof user?.publicMetadata?.location === "string" && user.publicMetadata.location.trim().length
      ? user.publicMetadata.location
      : null;

  const stats: Array<{ label: string; value: string }> = [];
  if (user?.createdAt) {
    stats.push({ label: "Date joined", value: created });
  }
  if (location) {
    stats.push({ label: "Location", value: location });
  }
  if (libraryCount !== null) {
    stats.push({ label: "Games in library", value: libraryCount.toLocaleString() });
  }
  if (boards.length) {
    stats.push({ label: "Boards", value: boards.length.toString() });
  }
  if (publicBoards.length) {
    stats.push({ label: "Public boards", value: publicBoards.length.toString() });
  }

  return (
    <AppShell
      title="Profile"
      description="Your account overview, profile details, and public boards."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={handleRefresh}
          disabled={!user || isRefreshing}
        >
          {isRefreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
          Refresh
        </Button>
      }
    >
      <SignedOut>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          <p className="text-sm">Sign in to load your user document.</p>
          <div className="mt-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="space-y-6">
          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {!isLoaded ? (
            <div className="flex items-center gap-2 text-sm text-indigo-100/80">
              <Loader2 className="size-4 animate-spin" />
              Loading user...
            </div>
          ) : null}

          {isLoaded && user ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <Avatar imageUrl={user.imageUrl} fallback={name} />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-indigo-200">Signed in as</p>
                    <h1 className="text-2xl font-semibold text-white">{name}</h1>
                    <p className="text-sm text-indigo-100/70">
                      {user.username ? `@${user.username}` : null}
                      {user.username && email ? " | " : null}
                      {email}
                    </p>
                  </div>
                  {stats.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-indigo-100/80"
                        >
                          <p className="text-xs uppercase tracking-wide text-indigo-200">{stat.label}</p>
                          <p className="text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

            </div>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Public boards</h2>
                <p className="text-sm text-indigo-100/70">Boards visible to others will appear here.</p>
              </div>
              {boardsLoading ? <Loader2 className="size-4 animate-spin text-indigo-200" aria-hidden /> : null}
            </div>

            {boardsError ? (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {boardsError}
              </div>
            ) : null}

            {publicBoards.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {publicBoards.map((board) => (
                  <PublicBoardCard
                    key={board.id}
                    board={board}
                    gameCount={boardGameCounts[board.id]}
                  />
                ))}
              </div>
            ) : !boardsLoading ? (
              <p className="mt-4 text-sm text-indigo-100/70">No public boards yet.</p>
            ) : null}
          </section>
        </div>
      </SignedIn>
    </AppShell>
  );
}

export function Avatar({ imageUrl, fallback }: { imageUrl?: string | null; fallback?: string | null }) {
  const fallbackLetter =
    (fallback?.trim().charAt(0)?.toUpperCase() || "U").slice(0, 1);

  if (imageUrl) {
    return (
      <div className="w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Profile avatar"
          className="h-16 w-16 rounded-full border border-white/10 object-cover sm:h-20 sm:w-20"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white sm:h-20 sm:w-20">
      {fallbackLetter}
    </div>
  );
}

export function PublicBoardCard({ board, gameCount }: { board: Board; gameCount?: number }) {
  const [previewGames, setPreviewGames] = useState<BoardGameWithGame[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const data = await fetchBoardGames({ boardId: board.id, limit: 4 });
        if (!cancelled) {
          setPreviewGames(data.items);
        }
      } catch {
        if (!cancelled) {
          setPreviewGames([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      }
    };
    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [board.id]);

  const thumbnails = previewGames
    .map((item) =>
      igdbImage(
        item.game?.coverUrl ||
          item.game?.headerImageUrl ||
          item.game?.backgroundImageUrl ||
          item.game?.screenshotUrls?.[0],
        "t_720p",
      ),
    )
    .filter((url): url is string => Boolean(url));

  return (
    <a
      href={`/boards/${board.id}`}
      className="group block rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-indigo-950/40 p-4 text-white shadow-md shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-indigo-200">Board</p>
          <h3 className="text-lg font-semibold">{board.name}</h3>
          <p className="text-xs text-indigo-100/70">Created {formatDate(board.createdAt)}</p>
        </div>
      </div>
      {board.description ? (
        <p className="mt-2 text-sm text-indigo-100/80">{board.description}</p>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="grid h-40 grid-cols-2 grid-rows-2 gap-0.5">
          {thumbnails.length ? (
            thumbnails.slice(0, 4).map((url, index) => (
              <div key={`${board.id}-thumb-${index}`} className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${board.name} preview ${index + 1}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-transparent to-slate-900/30 opacity-0 transition group-hover:opacity-100" />
              </div>
            ))
          ) : (
            <div className="col-span-2 row-span-2 flex items-center justify-center bg-gradient-to-br from-slate-800/80 to-indigo-900/60 text-sm text-indigo-100/70">
              {isLoadingPreview ? "Loading preview..." : "No games yet"}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-indigo-100/80">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
          Public
        </span>
        {typeof gameCount === "number" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-1 text-indigo-50">
            <Gamepad2 className="size-3.5" />
            {gameCount} game{gameCount === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-indigo-100/60">
            Loading games...
          </span>
        )}
      </div>
    </a>
  );
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
