import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import type { ApiResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type GamePageProps = {
  params: { id: string };
};

async function loadGame(id: string): Promise<{ game?: Game; error?: string }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL : ""}/api/games/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });

  let payload: ApiResult<Game> | null = null;
  try {
    payload = (await response.json()) as ApiResult<Game>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Invalid JSON response: ${message}` };
  }

  if (!response.ok) {
    return { error: payload?.error ?? `Request failed (${response.status})` };
  }

  if (!payload?.success) {
    return { error: payload?.error ?? `Request failed (${response.status})` };
  }

  return { game: payload.data };
}

export default async function GameDetailsPage({ params }: GamePageProps) {
  const id = params.id?.trim();
  if (!id) {
    notFound();
  }

  const { game, error } = await loadGame(id);
  const description =
    "Displays a single cached game from /api/games/:id. The lookup also supports IGDB and RAWG variants from the docs.";

  if (!game) {
    return (
      <AppShell title="Game not found" description={description}>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          {error ?? "No game was returned for this id."}
          <div className="mt-4">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to games
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={game.title} description={description}>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 font-semibold uppercase tracking-wide text-indigo-100">
                Source {game.source}
              </span>
              {game.metacritic ? (
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-100">
                  Metacritic {game.metacritic}
                </span>
              ) : null}
              {game.esrbRating ? (
                <span className="rounded-full bg-white/10 px-3 py-1 font-semibold uppercase tracking-wide text-indigo-100">
                  ESRB {game.esrbRating}
                </span>
              ) : null}
            </div>

            {game.coverUrl || game.headerImageUrl || game.backgroundImageUrl ? (
              <div className="overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={game.coverUrl ?? game.headerImageUrl ?? game.backgroundImageUrl}
                  alt={game.title}
                  className="h-72 w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}

            <p className="text-sm leading-7 text-indigo-100/80">
              {game.description || "No description available for this title."}
            </p>

            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem label="Release date" value={formatDate(game.releaseDate)} />
              <DetailItem label="Updated" value={formatDate(game.updated)} />
              <DetailItem label="Platforms" value={formatList(game.platforms)} />
              <DetailItem label="Genres" value={formatList(game.genres)} />
              <DetailItem label="Developers" value={formatList(game.developers)} />
              <DetailItem label="Publishers" value={formatList(game.publishers)} />
              <DetailItem label="Tags" value={formatList(game.tags)} />
            </dl>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          <h2 className="text-lg font-semibold text-white">Identifiers</h2>
          <dl className="mt-3 space-y-2 text-sm text-indigo-100/80">
            <DetailItem label="GoodGame id" value={game.id} />
            <DetailItem label="IGDB id" value={game.igdbId ? String(game.igdbId) : "—"} />
            <DetailItem label="RAWG id" value={game.rawgId ? String(game.rawgId) : "—"} />
            {game.websiteUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-indigo-200">Website</span>
                <Link
                  href={game.websiteUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-indigo-100 underline decoration-indigo-500/50 underline-offset-2 hover:text-white"
                >
                  Visit <ExternalLink className="size-4" />
                </Link>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/5 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-200">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

function formatList(values?: string[]) {
  if (!values || values.length === 0) return "—";
  return values.join(", ");
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
