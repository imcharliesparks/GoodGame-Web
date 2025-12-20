import { NextRequest, NextResponse } from "next/server";

import { requireAuthToken } from "../../../_lib/auth";
import { respondWithError } from "../../../_lib/errors";
import { denyFriendRequest } from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";
import type { FriendRequest } from "@/lib/types/friend-request";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params?.id?.trim();

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
    const data = await denyFriendRequest(id, { token: authResult.token });
    return NextResponse.json<ApiResult<{ request: FriendRequest }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
