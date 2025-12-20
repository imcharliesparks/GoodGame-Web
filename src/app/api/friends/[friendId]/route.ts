import { NextRequest, NextResponse } from "next/server";

import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import { removeFriend } from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ friendId: string }> },
) {
  const { friendId: rawFriendId } = await context.params;
  const friendId = rawFriendId?.trim();

  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  if (!friendId) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "friendId is required." },
      { status: 400 },
    );
  }

  try {
    const data = await removeFriend(friendId, { token: authResult.token });
    return NextResponse.json<ApiResult<{ success: boolean }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
