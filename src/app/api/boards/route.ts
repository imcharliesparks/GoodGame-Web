import { NextResponse } from "next/server";

import { requireAuthToken } from "../_lib/auth";
import { respondWithError } from "../_lib/errors";
import {
  createBoard,
  listBoards,
  type CreateBoardInput,
} from "@/lib/data/boards";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
    const data = await listBoards(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<PaginatedResult<Board>>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const parsed = await parseBody(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await createBoard(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<Board>>({
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

async function parseBody(
  request: Request,
): Promise<CreateBoardInput | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const { name, description, isPublic } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "Name is required.", status: 400 };
  }

  if (description !== undefined && typeof description !== "string") {
    return { error: "Description must be a string.", status: 400 };
  }

  if (isPublic !== undefined && typeof isPublic !== "boolean") {
    return { error: "isPublic must be a boolean.", status: 400 };
  }

  return {
    name: name.trim(),
    description: description as string | undefined,
    isPublic: isPublic as boolean | undefined,
  };
}
