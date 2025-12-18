import { NextResponse } from "next/server";

import { getOptionalAuthToken, requireAuthToken } from "../../../_lib/auth";
import { respondWithError } from "../../../_lib/errors";
import {
  addBoardGame,
  listBoardGames,
  type AddBoardGameInput,
} from "@/lib/data/boards";
import type { ApiResult, PaginatedResult } from "@/lib/types/api";
import type {
  BoardGame,
  BoardGameWithGame,
  GameStatus,
} from "@/lib/types/board-game";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_STATUSES: GameStatus[] = [
  "OWNED",
  "PLAYING",
  "COMPLETED",
  "WISHLIST",
];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authResult = await getOptionalAuthToken();

  const { id } = await context.params;
  const boardId = id?.trim();
  if (!boardId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "boardId is required." },
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
    const data = await listBoardGames(
      { boardId, ...parsed },
      { token: authResult.token },
    );
    return NextResponse.json<ApiResult<PaginatedResult<BoardGameWithGame>>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const boardId = id?.trim();
  if (!boardId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "boardId is required." },
      { status: 400 },
    );
  }

  const parsed = await parseBody(request, boardId);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await addBoardGame(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<BoardGame>>({
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
  boardId: string,
): Promise<AddBoardGameInput | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const { gameId, status, rating, notes, order } = body as Record<
    string,
    unknown
  >;

  if (typeof gameId !== "string" || gameId.trim() === "") {
    return { error: "gameId is required.", status: 400 };
  }

  if (status !== undefined && !isValidStatus(status)) {
    return {
      error: "status must be one of OWNED, PLAYING, COMPLETED, WISHLIST.",
      status: 400,
    };
  }

  let numericRating: number | undefined;
  if (rating !== undefined) {
    numericRating = Number(rating);
    if (!Number.isFinite(numericRating)) {
      return { error: "rating must be a number.", status: 400 };
    }
  }

  if (notes !== undefined && typeof notes !== "string") {
    return { error: "notes must be a string.", status: 400 };
  }

  let numericOrder: number | undefined;
  if (order !== undefined) {
    numericOrder = Number(order);
    if (!Number.isInteger(numericOrder) || numericOrder < 0) {
      return { error: "order must be an integer >= 0.", status: 400 };
    }
  }

  return {
    boardId,
    gameId: gameId.trim(),
    status: status as GameStatus | undefined,
    rating: numericRating,
    notes: notes as string | undefined,
    order: numericOrder,
  };
}

function isValidStatus(value: unknown): value is GameStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as GameStatus);
}
