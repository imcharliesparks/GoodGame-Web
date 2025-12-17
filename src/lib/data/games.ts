import { callTrpcProcedure, type TrpcCallOptions } from "@/lib/data/trpc";
import type { PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

export type GameSearchInput = {
  query: string;
  limit: number;
  cursor?: string;
};

export async function searchCached(
  input: GameSearchInput,
  options: TrpcCallOptions,
) {
  return callTrpcProcedure<GameSearchInput, PaginatedResult<Game>>(
    "game.searchCached",
    input,
    options,
  );
}

export async function searchSteamAndCache(
  input: GameSearchInput,
  options: TrpcCallOptions,
) {
  return callTrpcProcedure<GameSearchInput, PaginatedResult<Game>>(
    "game.searchSteamAndCache",
    input,
    options,
  );
}
