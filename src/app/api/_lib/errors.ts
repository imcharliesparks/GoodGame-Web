import { NextResponse } from "next/server";

import { ArgusHttpError } from "@/lib/argus/http";
import type { ApiResult } from "@/lib/types/api";

export function respondWithError(error: unknown) {
  const status = asHttpStatus(error) ?? 502;
  const message = error instanceof Error ? error.message : "Upstream error";

  if (error instanceof Error && error.message.includes("ARGUS_URL")) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  if (error instanceof TypeError) {
    return NextResponse.json<ApiResult<null>>(
      {
        success: false,
        error:
          "Failed to reach the backend. Check ARGUS_URL (must include http:// or https://) and ensure Argus is running.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json<ApiResult<null>>(
    { success: false, error: message },
    { status },
  );
}

function asHttpStatus(error: unknown) {
  if (error instanceof ArgusHttpError) return error.status;
  return undefined;
}
