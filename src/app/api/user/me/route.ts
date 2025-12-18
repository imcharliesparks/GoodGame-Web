import { NextResponse } from "next/server";

import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import { getCurrentUser } from "@/lib/data/user";
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
    const data = await getCurrentUser({ token: authResult.token });
    return NextResponse.json<ApiResult<User>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
