import { NextResponse } from "next/server";

import { ArgusHttpError } from "@/lib/argus/http";
import { searchCached } from "@/lib/data/games";
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
    const data = await searchCached(parsed);
    const { nextCursor: rawNextCursor, ...rest } = data;
    const nextCursor =
      typeof rawNextCursor === "string" && rawNextCursor.length > 0
        ? rawNextCursor
        : undefined;

    return NextResponse.json<ApiResult<PaginatedResult<Game>>>({
      success: true,
      data: nextCursor ? { ...rest, nextCursor } : rest,
    });
  } catch (error) {
    return handleError(error);
  }
}

function parseQuery(request: Request):
  | {
      query: string;
      limit: number;
      cursor?: string;
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limitParam = searchParams.get("limit");
  const cursorRaw = searchParams.get("cursor");
  const cursor = cursorRaw === null ? undefined : cursorRaw;

  if (!query) {
    return { error: "Search query (q) is required.", status: 400 };
  }

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = Number(limitParam);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { error: "Limit must be a positive number.", status: 400 };
    }
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  return { query, limit, cursor };
}

function handleError(error: unknown) {
  const status = asHttpStatus(error) ?? 502;
  const message = error instanceof Error ? error.message : "Upstream error";

  if (error instanceof Error && error.message.includes("ARGUS_URL")) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  if (error instanceof TypeError) {
    return NextResponse.json<ApiResult<null>>(
      {
        success: false,
        error:
          "Failed to reach the backend. Check ARGUS_URL (must include http:// or https://) and ensure Argus is running.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json<ApiResult<null>>(
    { success: false, error: message },
    { status },
  );
}

function asHttpStatus(error: unknown) {
  if (error instanceof ArgusHttpError) return error.status;
  return undefined;
}
