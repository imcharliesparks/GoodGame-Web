import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type RequestGameSearchOptions = {
  term: string;
  limit: number;
  cursor?: string;
  signal?: AbortSignal;
};

export async function requestGameSearch({
  term,
  limit,
  cursor,
  signal,
}: RequestGameSearchOptions): Promise<PaginatedResult<Game>> {
  const params = new URLSearchParams({
    q: term,
    limit: String(limit),
    mode: "cached",
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`/api/games/search?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  let payload: ApiResult<PaginatedResult<Game>> | null = null;
  try {
    payload = (await response.json()) as ApiResult<PaginatedResult<Game>>;
  } catch {
    // ignore parse failure; handled below
  }

  if (!payload || !payload.success || !payload.data) {
    const reason =
      payload?.error ??
      (response.ok
        ? "Unexpected response from server."
        : `Request failed (${response.status}).`);
    throw new Error(reason);
  }

  return payload.data;
}

