import { NextRequest, NextResponse } from "next/server";

import { requireAuthToken } from "../../../_lib/auth";
import { respondWithError } from "../../../_lib/errors";
import { acceptFriendRequest } from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";
import type { FriendRequest } from "@/lib/types/friend-request";

export async function POST(
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
      { success: false, error: "id is required." },
      { status: 400 },
    );
  }

  try {
    const data = await acceptFriendRequest(id, { token: authResult.token });
    return NextResponse.json<ApiResult<{ request: FriendRequest }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
