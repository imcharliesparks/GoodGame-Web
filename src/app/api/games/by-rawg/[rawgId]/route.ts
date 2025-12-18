import { NextResponse } from "next/server";

import { respondWithError } from "../../../_lib/errors";
import { getGameByRawgId } from "@/lib/data/games";
import type { ApiResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type RouteContext = {
  params: {
    rawgId?: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  const rawgIdParam = context.params.rawgId;
  const rawgId = Number(rawgIdParam);

  if (!rawgIdParam || !Number.isInteger(rawgId) || rawgId <= 0) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Invalid rawgId" },
      { status: 400 },
    );
  }

  try {
    const data = await getGameByRawgId({ rawgId });
    return NextResponse.json<ApiResult<Game>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
