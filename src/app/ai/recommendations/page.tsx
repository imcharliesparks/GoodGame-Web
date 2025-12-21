"use client";

import { useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, Sparkles, Wand2, X } from "lucide-react";

import { GameResultsGrid, GameResultsLoadingGrid } from "@/components/games/search/GameResultsGrid";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchGameById } from "@/lib/client/games";
import {
  requestRecommendations,
  type RecommendationResponse,
} from "@/lib/client/recommendations";
import type { Game } from "@/lib/types/game";

type ConversationTurn = {
  id: string;
  query: string;
  items: Array<{ game: Game; reason: string }>;
};

const SAMPLE_PROMPTS = [
  "Action game from my library I haven't started yet on PS5 or Switch",
  "Short cozy game I can finish tonight",
  "Backlog pick with great reviews on PC",
  "Multiplayer co-op I can play this weekend",
];

export default function RecommendationsPage() {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const term = query.trim();
    if (!term || isLoading) return;

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await requestRecommendations({ query: term, signal: controller.signal });
      const hydrated = await hydrateResults(response, controller.signal);

      setTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), query: term, items: hydrated },
      ]);
      setQuery("");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to get recommendations.");
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  const stopRequest = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsLoading(false);
  };

  const emptyState = turns.length === 0 && !isLoading;

  return (
    <AppShell
      title="Curator"
      description="Your personal game sommelier. Describe your mood or setup and Curator pours you picks from your own Library board—never invented, always yours."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:border-white hover:bg-white/10"
          onClick={() => {
            setTurns([]);
            setError(null);
          }}
        >
          <X className="mr-2 size-4" />
          Clear chat
        </Button>
      }
    >
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950 to-indigo-950/60 p-6 shadow-xl shadow-indigo-900/40">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600/70 text-white shadow-lg shadow-indigo-900/40">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200">
                Curator · Game Sommelier
              </p>
              <p className="text-indigo-100/80">
                Describe the vibe or platform and Curator serves picks from your Library board.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. A fast-paced shooter on PS5 that I haven't started"
                className="flex-1 bg-white/5 text-white placeholder:text-indigo-100/60"
                disabled={isLoading}
              />
              <div className="flex gap-2">
                {isLoading ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={stopRequest}
                  >
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Stop
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-900/30 hover:brightness-105"
                  disabled={!query.trim() || isLoading}
                >
                  <Send className="mr-2 size-4" />
                  Send
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-indigo-50 hover:border-white hover:bg-white/10"
                  onClick={() => setQuery(prompt)}
                  disabled={isLoading}
                >
                  <Wand2 className="mr-2 size-4" />
                  {prompt}
                </Button>
              ))}
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-50">
                {error}
              </div>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-6">
        {emptyState ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-indigo-100/80">
            <p className="flex items-center gap-2 text-indigo-50">
              <MessageCircle className="size-4" />
              Start a chat to see personalized picks from your library.
            </p>
            <p className="mt-2 text-indigo-100/70">
              Suggestions stay within your existing games; we never invent titles.
            </p>
          </div>
        ) : null}

        {turns.map((turn) => {
          const reasonMap: Record<string, string> = Object.fromEntries(
            turn.items.map((item) => [item.game.id, item.reason]),
          );

          return (
            <div
              key={turn.id}
              className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-indigo-950/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white">
                  <MessageCircle className="size-4" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-indigo-100">You asked</p>
                  <p className="rounded-lg bg-black/30 px-3 py-2 text-indigo-50">{turn.query}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-500/80 text-white shadow-lg shadow-indigo-900/40">
                  <Bot className="size-4" />
                </div>
                <div className="flex-1 space-y-3">
                  {turn.items.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-indigo-100/80">
                      No picks yet. Try a broader prompt or make sure your Library board has games.
                    </div>
                  ) : (
                    <GameResultsGrid
                      games={turn.items.map((item) => item.game)}
                      reasons={reasonMap}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading ? <GameResultsLoadingGrid /> : null}
      </section>
    </AppShell>
  );
}

async function hydrateResults(
  response: RecommendationResponse,
  signal?: AbortSignal,
): Promise<Array<{ game: Game; reason: string }>> {
  if (!response.results.length) return [];

  const settled = await Promise.allSettled(
    response.results.map(async (item) => {
      const game = await fetchGameById(item.gameId, { signal });
      return { game, reason: item.reason };
    }),
  );

  const hydrated: Array<{ game: Game; reason: string }> = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      hydrated.push(result.value);
    } else if (signal?.aborted) {
      break;
    }
  }

  return hydrated;
}
