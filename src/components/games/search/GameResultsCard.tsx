"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { AlertCircle, Bookmark, Loader2, Plus } from "lucide-react";

import { AddToBoardDialog } from "@/components/games/AddToBoardDialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { igdbImage } from "@/lib/igdbImage";
import type { Game } from "@/lib/types/game";
import type { GameStatus } from "@/lib/types/board-game";

export type SaveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "saved" }
  | { status: "error"; message: string };

export type BoardMembership = {
  boardId: string;
  boardName: string;
  status: GameStatus;
};

type Props = {
  game: Game;
  reason?: string;
  saveState?: SaveState;
  onSave?: () => void;
  onRemove?: () => void;
  onBoardAdded?: (boardName: string) => void;
  boardMemberships?: BoardMembership[];
};

export function GameResultsCard({
  game,
  reason,
  saveState = { status: "idle" },
  onSave = () => {},
  onRemove = () => {},
  onBoardAdded,
  boardMemberships = [],
}: Props) {
  const isSaved = saveState.status === "saved";
  const isLoading = saveState.status === "loading";
  const hasError = saveState.status === "error";

  const coverUrl = igdbImage(
    game.coverUrl ?? game.headerImageUrl ?? game.backgroundImageUrl,
    "t_thumb",
  );

  const handleBookmarkClick = () => {
    if (isSaved) {
      onRemove();
    } else {
      onSave();
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400/30 hover:shadow-xl hover:shadow-indigo-500/20">
      {/* Bookmark (Save) Action - Top Right */}
      <SignedIn>
        <div className="absolute right-3 top-3 z-10">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={`h-9 w-9 cursor-pointer rounded-full border bg-slate-900/80 backdrop-blur-sm transition-all ${
                    isSaved
                      ? "border-amber-400/50 text-amber-400 hover:border-amber-300 hover:bg-amber-500/10 hover:text-amber-300"
                      : "border-white/20 text-white/60 hover:border-white/40 hover:bg-white/10 hover:text-white"
                  } disabled:opacity-40 disabled:pointer-events-none`}
                  onClick={handleBookmarkClick}
                  disabled={isLoading}
                  aria-label={isSaved ? "Remove from saved" : "Save for later"}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bookmark
                      className={`h-4 w-4 transition-transform ${
                        isSaved ? "fill-amber-400 scale-110" : ""
                      }`}
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="border-white/20 bg-slate-800 text-xs text-white"
              >
                {isSaved ? "Saved" : "Save for later"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SignedIn>

      <div className="p-5">
        {/* Game Info Section */}
        <Link
          href={`/games/${game.id}`}
          className="group/link mb-4 flex gap-4 rounded-lg p-2 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          <CoverImage url={coverUrl} title={game.title} />
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <h3 className="text-lg font-semibold leading-tight text-white transition-colors group-hover/link:text-indigo-300">
              {game.title}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-300">
              {game.description || "No description available."}
            </p>

            {/* Metadata Tags */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {renderMeta(game.platforms, "platform", 2)}
              {renderMeta(game.genres, "genre", 2)}
            </div>

            {/* Release Date & Metacritic */}
            {game.releaseDate || game.metacritic ? (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {game.releaseDate ? (
                  <span>{formatDate(game.releaseDate)}</span>
                ) : null}
                {game.metacritic ? (
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 font-semibold ${
                      game.metacritic >= 75
                        ? "bg-green-500/20 text-green-300"
                        : game.metacritic >= 50
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {game.metacritic}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Link>

        {/* AI Recommendation Reason */}
        {reason ? (
          <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5">
            <p className="text-sm leading-relaxed text-indigo-50">
              <span className="font-semibold text-indigo-200">Why: </span>
              {reason}
            </p>
          </div>
        ) : null}

        {/* State Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Board Membership Badges (non-clickable state indicators) */}
          {boardMemberships.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {boardMemberships.slice(0, 2).map((membership) => (
                <div
                  key={membership.boardId}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    {membership.status === "WISHLIST"
                      ? "Wishlist"
                      : membership.status === "PLAYING"
                        ? "Playing"
                        : membership.status === "COMPLETED"
                          ? "Completed"
                          : `In ${membership.boardName}`}
                  </span>
                </div>
              ))}
              {boardMemberships.length > 2 ? (
                <div className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1.5 text-xs font-medium text-slate-300">
                  +{boardMemberships.length - 2} more
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Primary Actions */}
          <SignedIn>
            <AddToBoardDialog
              game={game}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  className="h-9 cursor-pointer rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 font-medium text-white shadow-lg shadow-indigo-900/30 transition-all hover:brightness-110 hover:shadow-indigo-500/40 active:translate-y-px active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add to Board
                </Button>
              }
              onAdded={({ boardName }) => onBoardAdded?.(boardName)}
            />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-full border border-white/30 bg-white/5 px-4 text-white/90 transition-all hover:border-white/50 hover:bg-white/10"
              >
                Sign in to save
              </Button>
            </SignInButton>
          </SignedOut>

          {/* Error State */}
          {hasError ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-xs text-red-200"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {saveState.message}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CoverImage({ url, title }: { url?: string | null; title: string }) {
  if (!url) {
    return (
      <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-slate-700/50 to-slate-800/50 text-xs font-medium text-slate-400">
        No art
      </div>
    );
  }

  return (
    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function renderMeta(values: string[] = [], keyPrefix: string, limit: number = 3) {
  return values.slice(0, limit).map((value, index) => (
    <span
      key={`${keyPrefix}-${index}`}
      className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/15"
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
