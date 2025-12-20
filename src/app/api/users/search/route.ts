import { NextResponse } from "next/server";

import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import { searchUsers } from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const parsed = parseQuery(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await searchUsers(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<{ users: User[] }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

function parseQuery(request: Request):
  | {
      query: string;
      limit: number;
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limitParam = searchParams.get("limit");

  if (!query || query.length < 2) {
    return { error: "Query q must be at least 2 characters.", status: 400 };
  }

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = Number(limitParam);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { error: "Limit must be a positive number.", status: 400 };
    }
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  return { query, limit };
}
