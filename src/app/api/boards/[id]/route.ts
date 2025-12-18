import { NextResponse } from "next/server";

import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";
import {
  deleteBoard,
  updateBoard,
  type UpdateBoardInput,
} from "@/lib/data/boards";
import type { ApiResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";

type RouteContext = {
  params: {
    id?: string;
  };
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const id = context.params.id?.trim();
  if (!id) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Board id is required." },
      { status: 400 },
    );
  }

  const parsed = await parseBody(request, id);
  if ("error" in parsed) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const data = await updateBoard(parsed, { token: authResult.token });
    return NextResponse.json<ApiResult<Board>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const id = context.params.id?.trim();
  if (!id) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: "Board id is required." },
      { status: 400 },
    );
  }

  try {
    const data = await deleteBoard(id, { token: authResult.token });
    return NextResponse.json<ApiResult<{ success: boolean }>>({
      success: true,
      data,
    });
  } catch (error) {
    return respondWithError(error);
  }
}

async function parseBody(
  request: Request,
  id: string,
): Promise<UpdateBoardInput | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const { name, description, isPublic, order } = body as Record<
    string,
    unknown
  >;

  if (
    name === undefined &&
    description === undefined &&
    isPublic === undefined &&
    order === undefined
  ) {
    return { error: "No fields to update.", status: 400 };
  }

  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return { error: "Name must be a non-empty string.", status: 400 };
  }

  if (description !== undefined && typeof description !== "string") {
    return { error: "Description must be a string.", status: 400 };
  }

  if (isPublic !== undefined && typeof isPublic !== "boolean") {
    return { error: "isPublic must be a boolean.", status: 400 };
  }

  let numericOrder: number | undefined;
  if (order !== undefined) {
    numericOrder = Number(order);
    if (!Number.isFinite(numericOrder) || numericOrder < 0) {
      return { error: "order must be a non-negative number.", status: 400 };
    }
  }

  return {
    id,
    name: name === undefined ? undefined : (name as string).trim(),
    description: description as string | undefined,
    isPublic: isPublic as boolean | undefined,
    order: numericOrder,
  };
}
