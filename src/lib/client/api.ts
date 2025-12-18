"use client";

import type { ApiResult } from "@/lib/types/api";

type RequestOptions = RequestInit & {
  expectData?: boolean;
};

function buildErrorMessage(
  payload: ApiResult<unknown> | null,
  response: Response,
): string {
  if (payload?.error) return payload.error;
  if (!response.ok) return `Request failed (${response.status})`;
  return "Unexpected response from server.";
}

/**
 * Helper for calling Next.js API routes that return the shared ApiResult shape.
 */
export async function apiFetch<T>(
  input: string,
  options: RequestOptions & { expectData: false },
): Promise<T | undefined>;
export async function apiFetch<T>(
  input: string,
  options?: RequestOptions,
): Promise<T>;
export async function apiFetch<T>(
  input: string,
  { expectData = true, ...init }: RequestOptions = {},
): Promise<T | undefined> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiResult<T> | null = null;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    // ignore parse errors and fall through to error handling
  }

  if (!payload || !payload.success) {
    throw new Error(buildErrorMessage(payload, response));
  }

  if (!expectData) {
    return undefined;
  }

  if (payload.data === undefined) {
    throw new Error(buildErrorMessage(null, response));
  }

  return payload.data;
}
