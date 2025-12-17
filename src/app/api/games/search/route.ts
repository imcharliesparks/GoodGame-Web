import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { searchCached, searchSteamAndCache } from "@/lib/data/games";
import { TrpcClientError } from "@/lib/data/trpc";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type SearchMode = "cached" | "warm";

export async function GET(request: Request) {
  const { userId, getToken } = auth();

  if (!userId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const parsed = parseQuery(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const data = await runSearch(parsed, token);
    return NextResponse.json<ApiResult<PaginatedResult<Game>>>({
      success: true,
      data,
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
      mode: SearchMode;
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor") ?? undefined;
  const modeParam = searchParams.get("mode") ?? "cached";

  if (!query) {
    return { error: "Search query (q) is required.", status: 400 };
  }

  if (modeParam !== "cached" && modeParam !== "warm") {
    return { error: "Invalid mode. Use 'cached' or 'warm'.", status: 400 };
  }

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = Number(limitParam);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { error: "Limit must be a positive number.", status: 400 };
    }
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  const mode: SearchMode = modeParam === "warm" ? "warm" : "cached";

  return { query, limit, cursor, mode };
}

async function runSearch(
  {
    query,
    limit,
    cursor,
    mode,
  }: {
    query: string;
    limit: number;
    cursor?: string;
    mode: SearchMode;
  },
  token: string,
) {
  if (mode === "warm") {
    return searchSteamAndCache({ query, limit, cursor }, { token });
  }
  return searchCached({ query, limit, cursor }, { token });
}

function handleError(error: unknown) {
  if (error instanceof TrpcClientError) {
    const status = error.status ?? 502;
    return NextResponse.json<ApiResult<null>>(
      {
        success: false,
        error: error.message || "Upstream tRPC error",
      },
      { status },
    );
  }

  return NextResponse.json<ApiResult<null>>(
    { success: false, error: "Unexpected server error." },
    { status: 500 },
  );
}
