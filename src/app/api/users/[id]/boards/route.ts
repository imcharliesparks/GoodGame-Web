import { NextResponse } from "next/server";

import { requireAuthToken } from "../../../_lib/auth";
import { respondWithError } from "../../../_lib/errors";
import { listBoardsByUser } from "@/lib/data/boards";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const userId = params.id?.trim();

  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  if (!userId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "User id is required." },
      { status: 400 },
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
    const data = await listBoardsByUser(
      {
        userId,
        limit: parsed.limit,
        cursor: parsed.cursor,
        visibility: parsed.visibility,
      },
      { token: authResult.token },
    );

    return NextResponse.json<ApiResult<PaginatedResult<Board>>>({
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
      visibility?: "public" | "private" | "all";
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const cursorRaw = searchParams.get("cursor");
  const visibilityRaw = searchParams.get("visibility");
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

  let visibility: "public" | "private" | "all" | undefined;
  if (visibilityRaw) {
    if (
      visibilityRaw !== "public" &&
      visibilityRaw !== "private" &&
      visibilityRaw !== "all"
    ) {
      return { error: "visibility must be public, private, or all.", status: 400 };
    }
    visibility = visibilityRaw;
  }

  return { limit, cursor, visibility: visibility ?? "public" };
}
