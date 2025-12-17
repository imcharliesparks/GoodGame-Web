import { getArgusUrl } from "@/lib/env";

export class ArgusHttpError extends Error {
  readonly status: number;
  readonly payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ArgusHttpError";
    this.status = status;
    this.payload = payload;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export type ArgusRequestOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  cache?: RequestCache;
  signal?: AbortSignal;
};

export async function argusRequestJson<T>(opts: ArgusRequestOptions): Promise<T> {
  const baseUrl = getArgusUrl();
  const url = new URL(opts.path.replace(/^\//, ""), `${baseUrl}/`);

  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers();
  if (opts.token) {
    headers.set("Authorization", `Bearer ${opts.token}`);
  }
  if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: opts.cache,
    signal: opts.signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string" &&
        (payload as { error: string }).error) ||
      response.statusText ||
      `Request failed (${response.status})`;
    throw new ArgusHttpError(response.status, message, payload);
  }

  return payload as T;
}

