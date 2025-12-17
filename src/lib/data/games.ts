import { createTrpcClient } from "@/lib/trpc/client";
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

export type TrpcCallOptions = {
  token?: string;
};

export async function searchCached(
  input: GameSearchInput,
  options: TrpcCallOptions = {},
) {
  const trpc = createTrpcClient({ token: options.token });
  return trpc.game.searchCached.query(input) as Promise<PaginatedResult<Game>>;
}

export async function listGames(
  input: GameListInput,
  options: TrpcCallOptions = {},
) {
  const trpc = createTrpcClient({ token: options.token });
  return trpc.game.list.query(input) as Promise<PaginatedResult<Game>>;
}

export async function getGameById(
  input: GetGameByIdInput,
  options: TrpcCallOptions = {},
) {
  const trpc = createTrpcClient({ token: options.token });
  return trpc.game.getById.query(input) as Promise<Game>;
}

export async function getGameByIgdbId(
  input: GetGameByIgdbIdInput,
  options: TrpcCallOptions = {},
) {
  const trpc = createTrpcClient({ token: options.token });
  return trpc.game.getByIgdbId.query(input) as Promise<Game>;
}

export async function getGameByRawgId(
  input: GetGameByRawgIdInput,
  options: TrpcCallOptions = {},
) {
  const trpc = createTrpcClient({ token: options.token });
  return trpc.game.getByRawgId.query(input) as Promise<Game>;
}
