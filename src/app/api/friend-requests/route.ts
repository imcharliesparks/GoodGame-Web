import { NextResponse } from "next/server";

import { requireAuthToken } from "../_lib/auth";
import { respondWithError } from "../_lib/errors";
import {
  listFriendRequests,
  sendFriendRequest,
} from "@/lib/data/friends";
import type { ApiResult } from "@/lib/types/api";
import type { FriendRequest } from "@/lib/types/friend-request";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const parsed = parseQuery(request);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await listFriendRequests(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<{ requests: FriendRequest[] }>>({
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
    const data = await sendFriendRequest(parsed.friendId, { token: authResult.token });
    return NextResponse.json<ApiResult<typeof data>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

function parseQuery(request: Request):
  | {
      direction?: "incoming" | "outgoing";
      limit: number;
    }
  | { error: string; status: number } {
  const { searchParams } = new URL(request.url);
  const directionRaw = searchParams.get("direction") ?? undefined;
  const direction =
    directionRaw === "incoming" || directionRaw === "outgoing"
      ? directionRaw
      : undefined;
  const limitParam = searchParams.get("limit");

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = Number(limitParam);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { error: "Limit must be a positive number.", status: 400 };
    }
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  return { direction, limit };
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
