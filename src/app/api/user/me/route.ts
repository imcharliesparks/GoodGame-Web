import { NextResponse } from "next/server";
import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import { createBoard, listBoards } from "@/lib/data/boards";
import { getCurrentUser } from "@/lib/data/user";
import type { ApiResult } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

const REQUIRED_BOARDS = [
  { name: "Liked", description: "Games you liked", isPublic: true },
  { name: "Wishlist", description: "Games you want to play", isPublic: true },
  { name: "Library", description: "Games you own", isPublic: true },
];

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
    await ensureDefaultBoards(authResult.token);
    return NextResponse.json<ApiResult<User>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

async function ensureDefaultBoards(token: string) {
  const boards = await listBoards({ limit: 50 }, { token });
  const existingNames = new Set(
    boards.items.map((board) => board.name.toLowerCase()),
  );

  for (const config of REQUIRED_BOARDS) {
    if (existingNames.has(config.name.toLowerCase())) continue;
    await createBoard(config, { token });
  }
}
