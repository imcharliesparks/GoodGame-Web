import { NextResponse } from "next/server";

import { searchCached } from "@/lib/data/games";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const isProduction = process.env.NODE_ENV === "production";
  const bypassAuth = !isProduction && process.env.BFF_BYPASS_AUTH !== "false";
  const { userId, token } = bypassAuth
    ? { userId: null as string | null, token: undefined as string | undefined }
    : await getClerkAuth();

  const parsed = parseQuery(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  if (!bypassAuth && (!userId || !token)) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const data = await searchCached(parsed, { token });
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
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor") ?? undefined;

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
  const message =
    error instanceof Error ? error.message : "Upstream tRPC error";

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
          "Failed to reach the tRPC backend. Check ARGUS_URL (must include http:// or https://) and ensure Argus is running.",
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
  const value = (error as { data?: { httpStatus?: unknown } } | null)?.data
    ?.httpStatus;
  return typeof value === "number" ? value : undefined;
}

async function getClerkAuth() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId, getToken } = await auth();
  const token = userId ? await getToken() : undefined;
  return { userId, token };
}
