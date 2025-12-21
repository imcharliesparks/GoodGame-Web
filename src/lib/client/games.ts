"use client";

import { apiFetch } from "./api";
import type { PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

export async function fetchGames(input: {
  limit: number;
  cursor?: string;
}) {
  const params = new URLSearchParams({
    limit: String(input.limit),
  });

  if (input.cursor) {
    params.set("cursor", input.cursor);
  }

  return apiFetch<PaginatedResult<Game>>(`/api/games?${params.toString()}`);
}

export async function fetchGameById(
  id: string,
  options: { signal?: AbortSignal } = {},
) {
  return apiFetch<Game>(`/api/games/${encodeURIComponent(id)}`, {
    signal: options.signal,
  });
}

export async function fetchGameByIgdbId(igdbId: number) {
  return apiFetch<Game>(`/api/games/by-igdb/${encodeURIComponent(String(igdbId))}`);
}

export async function fetchGameByRawgId(rawgId: number) {
  return apiFetch<Game>(`/api/games/by-rawg/${encodeURIComponent(String(rawgId))}`);
}
