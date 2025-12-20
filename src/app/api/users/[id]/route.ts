import { NextRequest, NextResponse } from "next/server";

import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import { getUserById } from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = rawId?.trim();

  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  if (!id) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "User id is required." },
      { status: 400 },
    );
  }

  try {
    const data = await getUserById(id, { token: authResult.token });
    return NextResponse.json<ApiResult<{ user: User }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
