import { NextResponse } from "next/server";

import { respondWithError } from "../_lib/errors";
import { fetchHealth } from "@/lib/data/health";
import type { ApiResult } from "@/lib/types/api";
import type { HealthStatus } from "@/lib/types/health";

export async function GET() {
  try {
    const data = await fetchHealth();
    return NextResponse.json<ApiResult<HealthStatus>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
