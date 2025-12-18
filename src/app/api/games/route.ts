import { NextResponse } from "next/server";

import { respondWithError } from "../_lib/errors";
import { listGames } from "@/lib/data/games";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const parsed = parseQuery(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await listGames(parsed);
    return NextResponse.json<ApiResult<PaginatedResult<Game>>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

function parseQuery(request: Request):
  | {
      limit: number;
      cursor?: string;
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const cursorRaw = searchParams.get("cursor");
  const cursor =
    cursorRaw === null || cursorRaw.trim() === "" ? undefined : cursorRaw;

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = Number(limitParam);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { error: "Limit must be a positive number.", status: 400 };
    }
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  return { limit, cursor };
}
