import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { getArgusUrl } from "@/lib/env";
import type { AppRouter } from "@/server-types/AppRouter";

export type TrpcClientOptions = {
  token?: string;
};

export function createTrpcClient(opts?: TrpcClientOptions) {
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `${getArgusUrl()}/trpc`,
        headers() {
          return opts?.token ? { Authorization: `Bearer ${opts.token}` } : {};
        },
      }),
    ],
  });
}
