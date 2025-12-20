import { NextResponse } from "next/server";

import { requireAuthToken } from "../_lib/auth";
import { respondWithError } from "../_lib/errors";
import { addFriend, listFriends } from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

export async function GET() {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  try {
    const data = await listFriends({ token: authResult.token });
    return NextResponse.json<ApiResult<{ friends: User[] }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const parsed = await parseBody(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await addFriend(parsed.friendId, { token: authResult.token });
    return NextResponse.json<ApiResult<{ friend: User }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

async function parseBody(
  request: Request,
): Promise<{ friendId: string } | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const { friendId } = body as Record<string, unknown>;
  if (typeof friendId !== "string" || friendId.trim().length === 0) {
    return { error: "friendId is required.", status: 400 };
  }

  return { friendId: friendId.trim() };
}
