"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Game } from "@/lib/types/game";

export function GameResultsGrid({ games }: { games: Game[] }) {
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
                  Released {formatDate(game.releaseDate)}{" "}
                  {game.metacritic ? `- Metacritic ${game.metacritic}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
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
