"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { AlertCircle, Check, Ellipsis, Heart, Loader2 } from "lucide-react";

import { AddToBoardDialog } from "@/components/games/AddToBoardDialog";
import { Button } from "@/components/ui/button";
import { igdbImage } from "@/lib/igdbImage";
import type { Game } from "@/lib/types/game";

export type BoardKey = "liked" | "wishlist" | "library";

export type QuickAddState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "added"; boardName: string; boardId?: string; fromInitial?: boolean }
  | { status: "error"; message: string };

export const ICON_BUTTON_CLASSES =
  "h-9 w-9 rounded-full bg-white/5 backdrop-blur border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white active:translate-y-[1px] active:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-40 disabled:pointer-events-none transition";
export const PRIMARY_BUTTON_CLASSES =
  "h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg shadow-indigo-900/30 hover:brightness-105 active:brightness-95 active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:opacity-60 disabled:shadow-none disabled:pointer-events-none transition";
export const SECONDARY_BUTTON_CLASSES =
  "h-10 rounded-full border border-white/30 text-white/90 bg-white/5 hover:bg-white/10 hover:border-white/50 active:bg-white/15 active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:opacity-60 disabled:pointer-events-none transition";

type QuickAddSnapshot = {
  liked: QuickAddState;
  wishlist: QuickAddState;
  library: QuickAddState;
};

export function GameResultsCard({
  game,
  reason,
  quickAddState,
  onQuickAdd,
  onDialogAdded,
  onRemove,
}: {
  game: Game;
  reason?: string;
  quickAddState: QuickAddSnapshot;
  onQuickAdd: (boardKey: BoardKey) => void;
  onDialogAdded: (boardName: string) => void;
  onRemove: (boardKey: BoardKey) => void;
}) {
  const likedState = quickAddState.liked;
  const wishlistState = quickAddState.wishlist;
  const libraryState = quickAddState.library;
  const states = [likedState, wishlistState, libraryState];
  const added = states.find((s) => s.status === "added") as
    | Extract<QuickAddState, { status: "added" }>
    | undefined;
  const errored = states.find((s) => s.status === "error") as
    | Extract<QuickAddState, { status: "error" }>
    | undefined;
  const actionIsError = Boolean(errored);
  const actionMessage =
    added && !added.fromInitial
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
      className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-indigo-900/40 p-4 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-indigo-500/30"
    >
      <SignedIn>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={`${ICON_BUTTON_CLASSES} ${
              likedState.status === "added" ? "text-rose-300 hover:text-rose-200" : ""
            }`}
            onClick={() => {
              if (likedState.status === "added") {
                onRemove("liked");
              } else {
                onQuickAdd("liked");
              }
            }}
            disabled={likedState.status === "loading"}
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
          <AddToBoardDialog
            game={game}
            trigger={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={ICON_BUTTON_CLASSES}
                aria-label="Add to another board"
              >
                <Ellipsis className="size-4" />
              </Button>
            }
            onAdded={({ boardName }) => onDialogAdded(boardName)}
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
              className={`${PRIMARY_BUTTON_CLASSES} px-4`}
              onClick={() => {
                if (libraryState.status === "added") {
                  onRemove("library");
                } else {
                  onQuickAdd("library");
                }
              }}
              disabled={libraryState.status === "loading"}
            >
              {libraryState.status === "loading" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {libraryState.status === "added" ? "In Library" : "Add to Library"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={`${SECONDARY_BUTTON_CLASSES} px-4`}
              onClick={() => {
                if (wishlistState.status === "added") {
                  onRemove("wishlist");
                } else {
                  onQuickAdd("wishlist");
                }
              }}
              disabled={wishlistState.status === "loading"}
            >
              {wishlistState.status === "loading" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {wishlistState.status === "added" ? "In Wishlist" : "Add to Wishlist"}
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

        {reason ? (
          <div className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-50/90">
            <span className="font-semibold text-indigo-50">Why: </span>
            {reason}
          </div>
        ) : null}
      </div>
    </article>
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
