import { NextResponse } from "next/server";

import { respondWithError } from "../../../_lib/errors";
import { getGameByRawgId } from "@/lib/data/games";
import type { ApiResult } from "@/lib/types/api";
import type { Game } from "@/lib/types/game";

type RouteContext = {
  params: Promise<{
    rawgId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { rawgId } = await context.params;
  const rawgIdParam = rawgId?.trim();
  const rawgIdNumber = Number(rawgIdParam);

  if (!rawgIdParam || !Number.isInteger(rawgIdNumber) || rawgIdNumber <= 0) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Invalid rawgId" },
      { status: 400 },
    );
  }

  try {
    const data = await getGameByRawgId({ rawgId: rawgIdNumber });
    return NextResponse.json<ApiResult<Game>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
