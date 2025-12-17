# Game Search Implementation Plan

## Scope
- Enable game search from the frontend via ARGUS_URL tRPC backend.
- Keep Next.js boundaries per CODEX: API routes handle auth; lib/data handles calls; UI is presentation only.

## TODO Checklist
- [ ] Env: ensure `ARGUS_URL` is configured for server runtime; add guard for missing value.
- [ ] Types: add shared `ApiResult<T>` and `Game` shape in `lib/types` aligned with backend fields (id, title, media URLs, tags, platforms, etc.).
- [ ] Client: create server-side tRPC caller in `lib/data/trpc.ts` that injects `Authorization: Bearer <Clerk JWT>` and surfaces normalized errors.
- [ ] Data layer: add `lib/data/games.ts` with `searchCached` (default) and `searchSteamAndCache` (explicit warm) using cursor pagination.
- [ ] API boundary: add `app/api/games/search/route.ts` to validate query (`q`, `limit`, `cursor?`, `mode?=cached|warm`), enforce Clerk auth, call data layer, and return `{ success, data, error }`.
- [ ] UI: add `/games/search` page with ShadCN input + results list. Debounce queries (~300ms) hitting cached search via API route.
- [ ] Pagination: implement cursor-based infinite scroll/reset on query change; disable warm search during in-flight requests.
- [ ] Warm search: add explicit “Search wider” action calling `mode=warm` only on click to respect rate limits.
- [ ] States: loading, empty, error messaging mapped from tRPC codes (`UNAUTHORIZED`, `TOO_MANY_REQUESTS`, etc.).
- [ ] Manual checks: sign-in flow, cached search, warm search, pagination stop on missing `nextCursor`, 401 redirect on sign-out.

## Notes
- Do not expose Clerk JWT directly to client; use API route proxy for client-side search.
- Images are external URLs; render directly, no uploads needed.
- Avoid AI/RAG additions per CODEX.
