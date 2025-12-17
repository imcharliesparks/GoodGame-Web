import { getArgusUrl } from "@/lib/env";

type TrpcErrorData = {
  code?: string;
  httpStatus?: number;
};

type TrpcErrorEnvelope = {
  message?: string;
  code?: string | number;
  data?: TrpcErrorData;
};

type TrpcResultEnvelope<T> = {
  data?: {
    json?: T;
  };
  error?: TrpcErrorEnvelope;
};

type TrpcResponse<T> = {
  result?: TrpcResultEnvelope<T>;
  error?: TrpcErrorEnvelope;
};

export class TrpcClientError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message);
    this.name = "TrpcClientError";
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

export type TrpcCallOptions = {
  token: string;
  signal?: AbortSignal;
  baseUrl?: string;
};

export async function callTrpcProcedure<TInput, TResult>(
  path: string,
  input: TInput,
  options: TrpcCallOptions,
): Promise<TResult> {
  if (!options.token) {
    throw new TrpcClientError("Missing auth token for tRPC call.", {
      code: "UNAUTHORIZED",
      status: 401,
    });
  }

  const baseUrl = options.baseUrl ?? getArgusUrl();
  const url = `${baseUrl}/trpc/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify({ id: Date.now(), json: input }),
    signal: options.signal,
    cache: "no-store",
  });

  const status = response.status;
  const body = (await safeJson(response)) as TrpcResponse<TResult> | null;

  if (!response.ok) {
    const error = body?.error ?? body?.result?.error;
    throw new TrpcClientError(
      error?.message ?? `tRPC request failed with status ${status}`,
      {
        code: asString(error?.data?.code ?? error?.code),
        status: error?.data?.httpStatus ?? status,
      },
    );
  }

  const error = body?.error ?? body?.result?.error;
  if (error) {
    throw new TrpcClientError(error.message ?? "Unknown tRPC error", {
      code: asString(error.data?.code ?? error.code),
      status: error.data?.httpStatus ?? status,
    });
  }

  const data = body?.result?.data?.json;
  if (data === undefined) {
    throw new TrpcClientError("Malformed tRPC response: missing data.", {
      code: "BAD_RESPONSE",
      status,
    });
  }

  return data as TResult;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}
