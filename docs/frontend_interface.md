# Frontend Integration Notes (Next.js React/TypeScript)

- **Transport & Auth**
  - tRPC over HTTPS; include `Authorization: Bearer <Clerk JWT>` on every user-specific call.
  - Clerk JWT `sub` maps to `User.id`; backend auto-upserts the user record.
  - tRPC error codes map to `UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `TOO_MANY_REQUESTS`.

- **Pagination**
  - Cursor pattern: input `{ limit, cursor? }`; response `{ items, nextCursor? }` for infinite scroll on boards/board games/game search.

- **Routers & Procedures (planned)**
  - `healthRouter`: `ping`.
  - `userRouter`: `me` → current profile.
  - `boardRouter`: `list`, `create`, `update`, `delete`, `reorder`.
  - `boardGameRouter`: `listByBoard`, `addToBoard`, `removeFromBoard`, `updateMetadata` (status/rating/notes), `reorderWithinBoard`.
  - `gameRouter`: `getById`, `getBySteamAppId`, `searchCached` (DB only), `searchSteamAndCache` (lightweight, rate-limited warming; avoid spamming from UI).
  - Pagination applies where returning lists; expect zod-validated inputs.

- **Core Data Shapes (Prisma schema)**
  - `User`: `{ id: string (Clerk), email: string, name?: string, avatarUrl?: string, createdAt: Date }`.
  - `Board`: `{ id: ObjectId, userId: string, name: string, description?: string, order: number, isPublic: boolean, createdAt: Date }`.
  - `BoardGame`: `{ id: ObjectId, boardId: ObjectId, gameId: ObjectId, order: number, status: 'OWNED'|'PLAYING'|'COMPLETED'|'WISHLIST', rating?: number, notes?: string, addedAt: Date }`.
  - `Game`: `{ id: ObjectId, steamAppId?: number, rawgId?: number, slug?: string, source: 'STEAM'|'RAWG', title: string, description?: string, coverUrl?: string, headerImageUrl?: string, backgroundImageUrl?: string, websiteUrl?: string, releaseDate?: Date, platforms: string[], genres: string[], tags: string[], developers: string[], publishers: string[], stores?: Json, ratings?: Json, screenshotUrls: string[], clipUrl?: string, metacritic?: number, esrbRating?: string, added?: number, updated?: Date, lastScrapedAt: Date }`.
  - Images are external URLs only; no uploads expected from frontend.

- **Usage guidance for Next.js**
  - Use Clerk SDK on web to obtain JWT and pass to tRPC client (set `Authorization` header).
  - Respect rate limits: prefer `searchCached` for typeahead; only call `searchSteamAndCache` on explicit user action and debounce.
  - Boards/games are user-scoped: display only the caller’s boards unless `isPublic` (public viewing may come later).
  - Status/rating/notes live on `BoardGame`, not `Game`; when showing a game in a board, fetch boardGame metadata alongside game details.
  - Use cursor pagination for infinite scroll; stop when `nextCursor` is absent.

- **Environment vars relevant to frontend**
  - Frontend needs Clerk publishable key; backend requires Clerk secret key and DB/API keys (backend-only).
  - No image hosting keys are needed on the frontend; render URLs returned from `Game`.

- **Operational expectations**
  - Background sync jobs refresh game data; frontend should not rely on immediate freshness after adding new games unless using the warm-cache endpoint.
  - Logging/metrics are backend concerns; frontend handles error states using returned codes/messages.

- **Caveats/plan quirks**
  - Data source is MongoDB via Prisma; external IDs (`steamAppId`, `rawgId`) are not primary keys.
  - A “Supabase” mention in the plan’s DoD looks stale; treat Clerk + MongoDB as current.
