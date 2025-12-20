import { NextResponse } from "next/server";

import { requireAuthToken } from "../../../../_lib/auth";
import { respondWithError } from "../../../../_lib/errors";
import {
  deleteBoardGame,
  updateBoardGame,
  type UpdateBoardGameInput,
} from "@/lib/data/boards";
import type { ApiResult } from "@/lib/types/api";
import type { BoardGame, GameStatus } from "@/lib/types/board-game";

const VALID_STATUSES: GameStatus[] = [
  "OWNED",
  "PLAYING",
  "COMPLETED",
  "WISHLIST",
];

type RouteContext = {
  params: Promise<{
    id: string;
    gameId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id, gameId } = await context.params;
  const boardId = id?.trim();
  const trimmedGameId = gameId?.trim();
  if (!boardId || !gameId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "boardId and gameId are required." },
      { status: 400 },
    );
  }

  const parsed = await parseBody(request, boardId, trimmedGameId);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await updateBoardGame(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<BoardGame>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id, gameId } = await context.params;
  const boardId = id?.trim();
  const trimmedGameId = gameId?.trim();
  if (!boardId || !gameId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "boardId and gameId are required." },
      { status: 400 },
    );
  }

  try {
    const data = await deleteBoardGame(boardId, trimmedGameId, {
      token: authResult.token,
    });
    return NextResponse.json<ApiResult<{ success: boolean }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

async function parseBody(
  request: Request,
  boardId: string,
  gameId: string,
): Promise<UpdateBoardGameInput | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const { status, rating, notes, platforms } = body as Record<string, unknown>;

  if (
    status === undefined &&
    rating === undefined &&
    notes === undefined &&
    platforms === undefined
  ) {
    return { error: "No fields to update.", status: 400 };
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

  let parsedPlatforms: string[] | undefined;
  if (platforms !== undefined) {
    if (!Array.isArray(platforms)) {
      return { error: "platforms must be an array of strings.", status: 400 };
    }

    parsedPlatforms = platforms
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);

    if (parsedPlatforms.length === 0) {
      parsedPlatforms = undefined;
    }
  }

  return {
    boardId,
    gameId,
    status: status as GameStatus | undefined,
    platforms: parsedPlatforms,
    rating: numericRating,
    notes: notes as string | undefined,
  };
}

function isValidStatus(value: unknown): value is GameStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as GameStatus);
}
