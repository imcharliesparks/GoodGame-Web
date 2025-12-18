import { NextResponse } from "next/server";

import { respondWithError } from "../../_lib/errors";
import { getGameById } from "@/lib/data/games";
import type { ApiResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const trimmedId = id?.trim();
  if (!id) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Game id is required." },
      { status: 400 },
    );
  }

  try {
    const data = await getGameById({ id: trimmedId });
    return NextResponse.json<ApiResult<Game>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
