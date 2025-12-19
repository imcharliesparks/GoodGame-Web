"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { AlertCircle, Check, Ellipsis, Heart, Loader2 } from "lucide-react";

import { AddToBoardSheet } from "@/components/games/AddToBoardSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addBoardGameClient, createBoardClient, fetchBoards } from "@/lib/client/boards";
import { igdbImage } from "@/lib/igdbImage";
import type { GameStatus } from "@/lib/types/board-game";
import type { Board } from "@/lib/types/board";
import type { Game } from "@/lib/types/game";

type BoardKey = "liked" | "wishlist" | "library";

type QuickAddState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "added"; boardName: string }
  | { status: "error"; message: string };

type QuickAddMap = Record<string, Partial<Record<BoardKey, QuickAddState>>>;

const BOARD_CONFIG: Record<
  BoardKey,
  { name: string; description: string; isPublic: boolean; status: GameStatus }
> = {
  liked: { name: "Liked", description: "Games you liked", isPublic: true, status: "WISHLIST" },
  wishlist: {
    name: "Wishlist",
    description: "Games you want to play",
    isPublic: true,
    status: "WISHLIST",
  },
  library: {
    name: "Library",
    description: "Games you own",
    isPublic: true,
    status: "OWNED",
  },
};

export function GameResultsGrid({ games }: { games: Game[] }) {
  const [boardIds, setBoardIds] = useState<Partial<Record<BoardKey, string>>>({});
  const [quickAdd, setQuickAdd] = useState<QuickAddMap>({});
  const ensuringRef = useRef<Partial<Record<BoardKey, Promise<{ id: string; name: string }>>>>(
    {},
  );

  if (!games.length) return null;

  const ensureBoard = async (key: BoardKey): Promise<{ id: string; name: string }> => {
    if (boardIds[key]) return { id: boardIds[key]!, name: BOARD_CONFIG[key].name };
    if (ensuringRef.current[key]) return ensuringRef.current[key]!;

    const promise = (async () => {
      let cursor: string | undefined;
      let found: Board | undefined;

      while (!found) {
        const data = await fetchBoards({ limit: 50, cursor });
        found = data.items.find(
          (board) => board.name.toLowerCase() === BOARD_CONFIG[key].name.toLowerCase(),
        );
        if (found || !data.nextCursor) break;
        cursor = data.nextCursor;
      }

      if (found) {
        setBoardIds((prev) => ({ ...prev, [key]: found!.id }));
        return { id: found.id, name: found.name };
      }

      const created = await createBoardClient(BOARD_CONFIG[key]);
      setBoardIds((prev) => ({ ...prev, [key]: created.id }));
      return { id: created.id, name: created.name };
    })();

    ensuringRef.current[key] = promise;
    try {
      return await promise;
    } finally {
      ensuringRef.current[key] = undefined;
    }
  };

  const setQuickState = (gameId: string, key: BoardKey, state: QuickAddState) => {
    setQuickAdd((prev) => ({
      ...prev,
      [gameId]: {
        ...(prev[gameId] ?? {}),
        [key]: state,
      },
    }));
  };

  const resolveBoardKeyFromName = (boardName: string): BoardKey | null => {
    const normalized = boardName.trim().toLowerCase();
    return (Object.keys(BOARD_CONFIG) as BoardKey[]).find(
      (key) => BOARD_CONFIG[key].name.toLowerCase() === normalized,
    ) ?? null;
  };

  const handleQuickAdd = async (game: Game, boardKey: BoardKey) => {
    const currentState = quickAdd[game.id]?.[boardKey];
    if (currentState?.status === "added") return;

    setQuickState(game.id, boardKey, { status: "loading" });
    try {
      const board = await ensureBoard(boardKey);
      await addBoardGameClient({
        boardId: board.id,
        gameId: game.id,
        status: BOARD_CONFIG[boardKey].status,
      });
      setQuickState(game.id, boardKey, {
        status: "added",
        boardName: board.name,
      });
    } catch (err) {
      setQuickState(game.id, boardKey, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed to add to board.",
      });
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {games.map((game) => {
        const likedState = quickAdd[game.id]?.liked ?? { status: "idle" };
        const wishlistState = quickAdd[game.id]?.wishlist ?? { status: "idle" };
        const libraryState = quickAdd[game.id]?.library ?? { status: "idle" };

        const states = [likedState, wishlistState, libraryState];
        const added = states.find((s) => s.status === "added") as
          | Extract<QuickAddState, { status: "added" }>
          | undefined;
        const errored = states.find((s) => s.status === "error") as
          | Extract<QuickAddState, { status: "error" }>
          | undefined;
        const actionIsError = Boolean(errored);
        const actionMessage = added
          ? `Added to ${added.boardName}`
          : errored
            ? errored.message
            : null;
        const coverUrl = igdbImage(
          game.coverUrl ?? game.headerImageUrl ?? game.backgroundImageUrl,
          "t_thumb",
        );

        return (
          <article
            key={game.id}
            className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-indigo-900/40 p-4 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-indigo-500/30"
          >
            <SignedIn>
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={`h-9 w-9 rounded-full border border-white/15 bg-white/5 text-slate-900 hover:bg-white/10 dark:text-white ${
                    likedState.status === "added" ? "text-rose-300" : ""
                  }`}
                  onClick={() => handleQuickAdd(game, "liked")}
                  disabled={likedState.status === "loading" || likedState.status === "added"}
                  aria-label="Quick like"
                >
                  {likedState.status === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`size-4 ${
                        likedState.status === "added" ? "fill-rose-300 text-rose-300" : ""
                      }`}
                    />
                  )}
                </Button>
                <AddToBoardSheet
                  game={game}
                  trigger={
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full border border-white/15 bg-white/5 text-slate-900 hover:bg-white/10 dark:text-white"
                      aria-label="Add to another board"
                    >
                      <Ellipsis className="size-4" />
                    </Button>
                  }
                  onAdded={({ boardName }) => {
                    const boardKey = resolveBoardKeyFromName(boardName);
                    if (boardKey) {
                      setQuickState(game.id, boardKey, { status: "added", boardName });
                    }
                  }}
                />
              </div>
            </SignedIn>

            <div className="flex flex-col gap-3">
              <Link
                href={`/games/${game.id}`}
                className="flex gap-3 rounded-lg px-1 py-1 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
              >
                <CoverImage url={coverUrl} title={game.title} />
                <div className="flex flex-1 flex-col gap-2">
                  <h3 className="text-lg font-semibold leading-tight text-white underline decoration-indigo-400/50 underline-offset-4">
                    {game.title}
                  </h3>
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
                      Released {formatDate(game.releaseDate)}{" "}
                      {game.metacritic ? `- Metacritic ${game.metacritic}` : ""}
                    </p>
                  ) : null}
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <SignedIn>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="border border-white/15 bg-white/10 text-slate-900 hover:bg-white/20 dark:text-white"
                    onClick={() => handleQuickAdd(game, "library")}
                    disabled={libraryState.status === "loading" || libraryState.status === "added"}
                  >
                    {libraryState.status === "loading" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Add to Library
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/25 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
                    onClick={() => handleQuickAdd(game, "wishlist")}
                    disabled={
                      wishlistState.status === "loading" || wishlistState.status === "added"
                    }
                  >
                    {wishlistState.status === "loading" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Add to Wishlist
                  </Button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
                    >
                      Sign in to save
                    </Button>
                  </SignInButton>
                </SignedOut>

                <div className="min-w-[140px] text-xs text-indigo-100/80">
                  {actionMessage ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                        actionIsError
                          ? "bg-rose-500/15 text-rose-100"
                          : "bg-emerald-500/15 text-emerald-100"
                      }`}
                      role={actionIsError ? "alert" : "status"}
                      aria-live={actionIsError ? "assertive" : "polite"}
                    >
                      {actionIsError ? (
                        <AlertCircle className="size-3.5" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      {actionMessage}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function GameResultsLoadingGrid() {
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

function CoverImage({ url, title }: { url?: string | null; title: string }) {
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

function formatDate(value: unknown) {
  const date = coerceDate(value);
  if (!date) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function coerceDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested = record.$date ?? record.date;
    if (typeof nested === "string" || typeof nested === "number") {
      const parsed = new Date(nested);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}
