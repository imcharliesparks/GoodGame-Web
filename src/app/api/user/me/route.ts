import { NextResponse } from "next/server";
import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import { createBoard, listBoards } from "@/lib/data/boards";
import { getCurrentUser } from "@/lib/data/user";
import type { ApiResult } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

const LIKED_BOARD_NAME = "Liked";

export async function GET() {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  try {
    const data = await getCurrentUser({ token: authResult.token });
    await ensureLikedBoard(authResult.token);
    return NextResponse.json<ApiResult<User>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

async function ensureLikedBoard(token: string) {
  const boards = await listBoards({ limit: 50 }, { token });
  const existing = boards.items.find(
    (board) => board.name.toLowerCase() === LIKED_BOARD_NAME.toLowerCase(),
  );
  if (existing) return existing;

  return createBoard(
    { name: LIKED_BOARD_NAME, description: "Games you liked", isPublic: false },
    { token },
  );
}
