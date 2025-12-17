import { argusRequestJson } from "@/lib/argus/http";
import type { PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

export type GameSearchInput = {
  query: string;
  limit: number;
  cursor?: string;
};

export type GameListInput = {
  limit: number;
  cursor?: string;
};

export type GetGameByIdInput = {
  id: string;
};

export type GetGameByIgdbIdInput = {
  igdbId: number;
};

export type GetGameByRawgIdInput = {
  rawgId: number;
};

export type ArgusCallOptions = {
  token?: string;
};

export async function searchCached(
  input: GameSearchInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<PaginatedResult<Game>>({
    path: "/api/games/search",
    token: options.token,
    query: {
      q: input.query,
      limit: input.limit,
      cursor: input.cursor,
    },
  });
}

export async function listGames(
  input: GameListInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<PaginatedResult<Game>>({
    path: "/api/games",
    token: options.token,
    query: {
      limit: input.limit,
      cursor: input.cursor,
    },
  });
}

export async function getGameById(
  input: GetGameByIdInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<Game>({
    path: `/api/games/${encodeURIComponent(input.id)}`,
    token: options.token,
  });
}

export async function getGameByIgdbId(
  input: GetGameByIgdbIdInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<Game>({
    path: `/api/games/by-igdb/${encodeURIComponent(String(input.igdbId))}`,
    token: options.token,
  });
}

export async function getGameByRawgId(
  input: GetGameByRawgIdInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<Game>({
    path: `/api/games/by-rawg/${encodeURIComponent(String(input.rawgId))}`,
    token: options.token,
  });
}
