import { NextResponse } from "next/server";

import { respondWithError } from "../../../_lib/errors";
import { getGameByIgdbId } from "@/lib/data/games";
import type { ApiResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type RouteContext = {
  params: {
    igdbId?: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  const igdbIdParam = context.params.igdbId;
  const igdbId = Number(igdbIdParam);

  if (!igdbIdParam || !Number.isInteger(igdbId) || igdbId <= 0) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Invalid igdbId" },
      { status: 400 },
    );
  }

  try {
    const data = await getGameByIgdbId({ igdbId });
    return NextResponse.json<ApiResult<Game>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
