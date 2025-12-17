# Frontend Integration Notes (Next.js React/TypeScript)

- **Transport & Auth**
  - REST over HTTPS; include `Authorization: Bearer <Clerk JWT>` on every protected/user-specific call.
  - Clerk JWT `sub` maps to `User.id`; backend auto-upserts the user record.
  - Prefer HTTP status-based handling: `401 Unauthorized`, `404 Not Found`, `400 Bad Request`, `409 Conflict`, `429 Too Many Requests`.

- **Pagination**
  - Cursor pattern: input `{ limit, cursor? }`; response `{ items, nextCursor? }` for infinite scroll on boards/board games/game search.

- **Endpoints (current)**
  - Health: `GET /health`.
  - User (protected): `GET /api/user/me`.
  - Boards (protected): `GET /api/boards`, `POST /api/boards`, `PATCH /api/boards/:id`, `DELETE /api/boards/:id`, `POST /api/boards/:id/reorder`.
  - Board Games (protected): `GET /api/boards/:boardId/board-games`, `POST /api/boards/:boardId/board-games`, `PATCH /api/boards/:boardId/board-games/:gameId`, `DELETE /api/boards/:boardId/board-games/:gameId`, `POST /api/boards/:boardId/board-games/:gameId/reorder`.
  - Games (public): `GET /api/games`, `GET /api/games/search`, `GET /api/games/:id`, `GET /api/games/by-igdb/:igdbId`, `GET /api/games/by-rawg/:rawgId`.
  - Pagination applies where returning lists; pass `limit`/`cursor` as query params and stop when `nextCursor` is absent.

- **Core Data Shapes (Prisma schema)**
  - `User`: `{ id: string (Clerk), email: string, name?: string, avatarUrl?: string, createdAt: Date }`.
  - `Board`: `{ id: ObjectId, userId: string, name: string, description?: string, order: number, isPublic: boolean, createdAt: Date }`.
  - `BoardGame`: `{ id: ObjectId, boardId: ObjectId, gameId: ObjectId, order: number, status: 'OWNED'|'PLAYING'|'COMPLETED'|'WISHLIST', rating?: number, notes?: string, addedAt: Date }`.
  - `Game`: `{ id: ObjectId, igdbId?: number, rawgId?: number, slug?: string, source: 'IGDB'|'RAWG', title: string, description?: string, coverUrl?: string, headerImageUrl?: string, backgroundImageUrl?: string, websiteUrl?: string, releaseDate?: Date, platforms: string[], genres: string[], tags: string[], developers: string[], publishers: string[], stores?: Json, ratings?: Json, screenshotUrls: string[], clipUrl?: string, metacritic?: number, esrbRating?: string, added?: number, updated?: Date, lastScrapedAt: Date }`.
  - Images are external URLs only; no uploads expected from frontend.

- **Usage guidance for Next.js**
  - Use Clerk SDK on web to obtain JWT and send it on requests (set `Authorization` header).
  - Prefer backend-cached search for typeahead and lists; avoid client-side calls to external providers.
  - Boards/games are user-scoped: display only the caller's boards unless `isPublic` (public viewing may come later).
  - Status/rating/notes live on `BoardGame`, not `Game`; when showing a game in a board, fetch boardGame metadata alongside game details.
  - Use cursor pagination for infinite scroll; stop when `nextCursor` is absent.

- **Environment vars relevant to frontend**
  - Frontend needs Clerk publishable key; backend requires Clerk secret key and DB/API keys (backend-only).
  - No image hosting keys are needed on the frontend; render URLs returned from `Game`.

- **Operational expectations**
  - Background sync jobs refresh game data; frontend should not rely on immediate freshness after adding new games.
  - Logging/metrics are backend concerns; frontend handles error states using returned codes/messages.

- **Caveats/plan quirks**
  - Data source is MongoDB via Prisma; external IDs (`igdbId`, `rawgId`) are not primary keys.
  - Treat Clerk + MongoDB as current.
