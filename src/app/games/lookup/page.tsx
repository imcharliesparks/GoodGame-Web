"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchGameById, fetchGameByIgdbId, fetchGameByRawgId } from "@/lib/client/games";
import type { Game } from "@/lib/types/game";

type LookupState = {
  value: string;
  isLoading: boolean;
  error: string | null;
  result: Game | null;
};

export default function GameLookupPage() {
  const [byId, setById] = useState<LookupState>({
    value: "",
    isLoading: false,
    error: null,
    result: null,
  });
  const [byIgdb, setByIgdb] = useState<LookupState>({
    value: "",
    isLoading: false,
    error: null,
    result: null,
  });
  const [byRawg, setByRawg] = useState<LookupState>({
    value: "",
    isLoading: false,
    error: null,
    result: null,
  });

  const runLookup = async (
    state: LookupState,
    setter: (next: LookupState) => void,
    fn: () => Promise<Game>,
  ) => {
    setter({ ...state, isLoading: true, error: null, result: null });
    try {
      const result = await fn();
      setter({ ...state, isLoading: false, result });
    } catch (err) {
      setter({
        ...state,
        isLoading: false,
        error: err instanceof Error ? err.message : "Lookup failed.",
      });
    }
  };

  return (
    <AppShell
      title="Game lookup"
      description="Hit the identifier-specific endpoints: /api/games/:id, /api/games/by-igdb/:igdbId, and /api/games/by-rawg/:rawgId."
    >
      <div className="grid gap-6 md:grid-cols-3">
        <LookupCard
          title="By GoodGame id"
          placeholder="ObjectId from the catalog"
          state={byId}
          onChange={(value) => setById((prev) => ({ ...prev, value }))}
          onSubmit={() =>
            runLookup(byId, setById, () => fetchGameById(byId.value.trim()))
          }
        />

        <LookupCard
          title="By IGDB id"
          placeholder="Numeric igdbId"
          state={byIgdb}
          onChange={(value) => setByIgdb((prev) => ({ ...prev, value }))}
          onSubmit={() =>
            runLookup(byIgdb, setByIgdb, () =>
              fetchGameByIgdbId(Number(byIgdb.value)),
            )
          }
        />

        <LookupCard
          title="By RAWG id"
          placeholder="Numeric rawgId"
          state={byRawg}
          onChange={(value) => setByRawg((prev) => ({ ...prev, value }))}
          onSubmit={() =>
            runLookup(byRawg, setByRawg, () =>
              fetchGameByRawgId(Number(byRawg.value)),
            )
          }
        />
      </div>
    </AppShell>
  );
}

function LookupCard({
  title,
  placeholder,
  state,
  onChange,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  state: LookupState;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-indigo-950/30">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={state.value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="bg-white/5 text-white placeholder:text-indigo-200/70"
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!state.value.trim() || state.isLoading}
          className="shrink-0"
        >
          <Search className="mr-2 size-4" />
          Lookup
        </Button>
      </div>

      {state.error ? (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {state.error}
        </div>
      ) : null}

      {state.result ? <LookupResult game={state.result} /> : null}
    </div>
  );
}

function LookupResult({ game }: { game: Game }) {
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-indigo-100/80">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-200">Title</p>
          <p className="text-white">{game.title}</p>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
          {game.source}
        </span>
      </div>
      <p className="line-clamp-3 text-xs text-indigo-100/70">
        {game.description || "No description available."}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="uppercase tracking-wide text-indigo-200">Platforms</p>
          <p className="text-white">{formatList(game.platforms)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-indigo-200">Genres</p>
          <p className="text-white">{formatList(game.genres)}</p>
        </div>
      </div>
      <p className="text-xs text-indigo-100/70">GoodGame id: {game.id}</p>
    </div>
  );
}

function formatList(values?: string[]) {
  if (!values || values.length === 0) return "—";
  return values.slice(0, 3).join(", ");
}
