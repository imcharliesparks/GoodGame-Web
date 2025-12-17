````md
# TRPC-CLIENT-MIGRATION.md
## Goal
Replace our custom `fetch`-based tRPC caller (manual `?input=...` format + envelope parsing) with the official tRPC client in our Next.js app, so we:
- Stop manually constructing tRPC URLs and query params
- Get end-to-end type inference from the backend router
- Get automatic transformer support (`superjson`)
- Gain batching + a cleaner calling API (`trpc.game.list.query(...)`)
- Reduce custom protocol/maintenance risk

---

## Phase 0 — Preconditions
- Our Express backend exposes tRPC at a single mount point, ideally:
  - `http://localhost:3001/trpc`
- Our backend exports the **router type** (not necessarily runtime code) so the Next.js app can import it for typing.

---

## Phase 1 — Verify backend tRPC mount + router type export

### Step 1.1: Confirm Express middleware mount path
In the backend, ensure we have something equivalent to:

```ts
// backend/src/server.ts (example)
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);
````

**Acceptance criteria**

* `GET http://localhost:3001/trpc/<someProcedure>` responds as expected (or errors in a valid tRPC shape)
* The base URL for all procedures is `/trpc`

---

### Step 1.2: Export `AppRouter` type from backend

In the backend router module:

```ts
// backend/src/trpc/router.ts
export const appRouter = /* ... */;
export type AppRouter = typeof appRouter;
```

**Acceptance criteria**

* `AppRouter` is exported from a stable import path (e.g. package export, or direct path if monorepo)

---

## Phase 2 — Install official tRPC client deps in Next.js

From the Next.js app:

```bash
bun add @trpc/client superjson
```

> Note: `@trpc/server` is not needed in the Next.js app unless you’re defining routers there too.

**Acceptance criteria**

* `bun install` succeeds
* `@trpc/client` resolves in the Next.js app

---

## Phase 3 — Create the official tRPC client wrapper in Next.js

### Step 3.1: Add a typed client factory

Create a file:

* `src/lib/trpc/client.ts` (or your preferred location)

```ts
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getArgusUrl } from "@/lib/env";

// IMPORTANT: import only the type (no runtime dependency required)
import type { AppRouter } from "@/server-types/AppRouter"; 
// ^ Update this import path to wherever the backend exports AppRouter

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
```

**Notes**

* `httpBatchLink` will batch multiple calls in the same tick (nice win).
* If you don’t want batching, use `httpLink` instead.

**Acceptance criteria**

* TypeScript compiles
* We can instantiate a client without runtime errors

---

## Phase 4 — Replace call sites

### Step 4.1: Convert one query call as a reference implementation

Before (current pattern):

```ts
const data = await callTrpcQuery("game.list", { limit: 20 }, { token });
```

After:

```ts
import { createTrpcClient } from "@/lib/trpc/client";

const trpc = createTrpcClient({ token });
const data = await trpc.game.list.query({ limit: 20 });
```

**Acceptance criteria**

* Data returns as expected
* No manual `?input=` URL construction exists in the calling code

---

### Step 4.2: Convert mutations similarly

Before:

```ts
const result = await callTrpcMutation("game.create", { name }, { token });
```

After:

```ts
const trpc = createTrpcClient({ token });
const result = await trpc.game.create.mutate({ name });
```

**Acceptance criteria**

* Mutations work
* Auth header still applies

---

## Phase 5 — Provide a BFF-style service wrapper (optional but recommended)

If you want the rest of the app to never directly call tRPC:

Create:

* `src/services/games.ts`

```ts
import { createTrpcClient } from "@/lib/trpc/client";

export async function listGames(args: { limit: number; token?: string }) {
  const trpc = createTrpcClient({ token: args.token });
  return trpc.game.list.query({ limit: args.limit });
}
```

Now the UI calls:

```ts
const games = await listGames({ limit: 20, token });
```

**Acceptance criteria**

* UI code no longer references `.game.list.query` directly (if desired)
* All tRPC usage is centralized

---

## Phase 6 — Remove old custom implementation

### Step 6.1: Delete the old fetch-based tRPC client module

Remove:

* `callTrpcQuery`
* `callTrpcMutation`
* `callTrpcProcedure`
* `parseTrpcResponse`
* `TrpcClientError` (unless you still want custom wrapping)
* The manual `superjson.deserialize` envelope logic

**Acceptance criteria**

* No remaining imports of the old module
* Repo builds clean

---

## Phase 7 — Error handling + DX improvements

### Step 7.1: Standardize error handling (recommended)

tRPC client errors can be handled as thrown exceptions (commonly `TRPCClientError`).
You can optionally wrap errors into your own `TrpcClientError` if you want consistent app-level handling.

Example (optional wrapper):

```ts
try {
  return await trpc.game.list.query({ limit: 20 });
} catch (err) {
  // Optionally normalize error shape here
  throw err;
}
```

**Acceptance criteria**

* Errors bubble in a predictable way
* No silent failures / unknown envelopes

---

## Phase 8 — Validation checklist

* [ ] Next.js app no longer constructs `/trpc/<path>?input=...` URLs manually
* [ ] Queries use `.query(...)`
* [ ] Mutations use `.mutate(...)`
* [ ] `superjson` transformer works (dates, maps, etc. round-trip)
* [ ] Auth token is included when provided
* [ ] Backend still only needs one mount: `/trpc`
* [ ] Type inference works end-to-end (procedure inputs + outputs)1

---

## Common pitfalls

1. **Wrong base URL**: client must point to `${baseUrl}/trpc` (not `/trpc/game.list`)
2. **Router type import**: import `type { AppRouter }` from backend; avoid runtime coupling if possible
3. **CORS / credentials**: if calling across origins, ensure backend CORS headers allow it
4. **Auth header casing**: use `Authorization` consistently unless your backend expects something else

---

## Deliverables

* `src/lib/trpc/client.ts` (official client factory)
* (Optional) `src/services/*` wrappers to enforce BFF boundaries
* Removal of old custom tRPC client module
* Updated call sites across app

```
```
