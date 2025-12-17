# Game Search Implementation Plan

## Scope
- Enable game search from the frontend via ARGUS_URL REST backend.
- Keep Next.js boundaries per CODEX: API routes handle auth; lib/data handles calls; UI is presentation only.

## TODO Checklist
- [x] Env: ensure `ARGUS_URL` is configured for server runtime; add guard for missing value.
- [x] Types: add shared `ApiResult<T>` and `Game` shape in `lib/types` aligned with backend fields (id, title, media URLs, tags, platforms, etc.).
- [x] Client: create a server-side REST client for Argus that injects `Authorization: Bearer <Clerk JWT>` and surfaces normalized errors.
- [x] Data layer: add `lib/data/games.ts` with `searchCached` (cursor pagination) aligned with backend endpoints.
- [x] API boundary: add `app/api/games/search/route.ts` to validate query (`q`, `limit`, `cursor?`), proxy to Argus, and return `{ success, data, error }`.
- [x] UI: add `/games/search` page with ShadCN input + results list. Debounce queries (~300ms) hitting cached search via API route.
- [x] Pagination: implement cursor-based infinite scroll/reset on query change.
- [x] States: loading, empty, error messaging mapped from HTTP statuses (401, 429, etc.).
- [ ] Manual checks: cached search, pagination stop on missing `nextCursor`, production auth behavior (401 when signed out).

## Notes
- Do not expose Clerk JWT directly to client; use API route proxy for client-side search.
- Images are external URLs; render directly, no uploads needed.
- Avoid AI/RAG additions per CODEX.
