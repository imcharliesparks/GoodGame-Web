import { NextResponse } from "next/server";

import { requireAuthToken } from "../../../../../_lib/auth";
import { respondWithError } from "../../../../../_lib/errors";
import { reorderBoardGame } from "@/lib/data/boards";
import type { ApiResult } from "@/lib/types/api";
import type { BoardGame } from "@/lib/types/board-game";

type RouteContext = {
  params: Promise<{
    id: string;
    gameId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const parsedOrder = await parseBody(request);
  if ("error" in parsedOrder) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsedOrder.error },
      { status: parsedOrder.status },
    );
  }

  try {
    const data = await reorderBoardGame(
      { boardId, gameId: trimmedGameId, order: parsedOrder.order },
      { token: authResult.token },
    );
    return NextResponse.json<ApiResult<BoardGame>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

async function parseBody(
  request: Request,
): Promise<{ order: number } | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const { order } = body as Record<string, unknown>;
  const numericOrder = Number(order);

  if (
    order === undefined ||
    !Number.isInteger(numericOrder) ||
    numericOrder < 0
  ) {
    return { error: "order must be an integer >= 0.", status: 400 };
  }

  return { order: numericOrder };
}
