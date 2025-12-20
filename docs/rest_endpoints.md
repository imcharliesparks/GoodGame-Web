# REST API Endpoints (Current)

This document lists the REST endpoints currently exposed by the Argus backend (Express).

## Base URL

- API server: `http://<HOST>:<PORT>`

## Auth

- Protected routes require `Authorization: Bearer <Clerk JWT>`.
- Local dev bypass is available when backend env has:
  - `DEV_BYPASS_AUTH=true` (and `NODE_ENV !== 'production'`)
  - Optional: `DEV_BYPASS_USER_ID`, `DEV_BYPASS_USER_EMAIL`

Error shape for auth failures:
- `401 { "error": "Unauthorized" }`

---

## Health

### `GET /health` (public)

- Returns:
  - `{ "status": "ok", "timestamp": "<iso>" }`

---

## Games (public)

### `GET /api/games`

List games from MongoDB with cursor pagination.

- Query params:
  - `limit` (default `20`, max `50`)
  - `cursor` (optional ObjectId string)
  - `source` (optional: `IGDB` or `RAWG`)
- Returns:
  - `{ "items": Game[], "nextCursor"?: string }` (when there is no next page, `nextCursor` is omitted)

### `GET /api/games/search`

Search cached games in MongoDB by title substring.

- Query params:
  - `q` (required)
  - `limit` (default `20`, max `50`)
  - `cursor` (optional opaque string returned by the endpoint)
- Returns:
  - `{ "items": Game[], "nextCursor"?: string }` (when there is no next page, `nextCursor` is omitted)

### `GET /api/games/:id`

- Path params:
  - `id` (required ObjectId string)
- Returns:
  - `Game`
- Errors:
  - `400 { "error": "Invalid id" }`
  - `404 { "error": "Not found" }`

### `GET /api/games/by-igdb/:igdbId`

- Path params:
  - `igdbId` (required number)
- Returns:
  - `Game`
- Errors:
  - `400 { "error": "Invalid igdbId" }`
  - `404 { "error": "Not found" }`

### `GET /api/games/by-rawg/:rawgId`

- Path params:
  - `rawgId` (required number)
- Returns:
  - `Game`
- Errors:
  - `400 { "error": "Invalid rawgId" }`
  - `404 { "error": "Not found" }`

---

## User (protected)

### `GET /api/user/me`

Upserts/returns the user document for the authenticated Clerk user.

- Returns:
  - `User`
- Errors:
  - `401 { "error": "Unauthorized" }`
  - `400 { "error": "Email missing from token (ensure Clerk emits email via `{{user.primary_email_address}}`)" }`

### `GET /api/users/search`

- Query params:
  - `q` (required, min length 2; matches email/name/username)
  - `limit` (default `20`, max `50`)
- Returns:
  - `{ "users": User[] }` (excludes the caller)

### `GET /api/users/:id`

- Returns:
  - `{ "user": User }`
- Errors:
  - `404 { "error": "Not found" }`

---

## Friends (protected)

### `GET /api/friends`

- Returns:
  - `{ "friends": User[] }` (ordered by when the friendship was created)

### `POST /api/friends`

- Body JSON:
  - `{ "friendId": string }`
- Behavior:
  - Adds a mutual friendship between the caller and `friendId` (no self-friend; friend must exist).
- Returns:
  - `{ "friend": User }`

### `DELETE /api/friends/:friendId`

- Behavior:
  - Removes the friendship in both directions.
- Returns:
  - `{ "success": true }`

### `GET /api/friend-requests`

- Query params:
  - `direction` (default `incoming`, values: `incoming` | `outgoing`)
  - `limit` (default `20`, max `50`)
- Returns:
  - `{ "requests": Array<FriendRequest & { requester: User | null; receiver: User | null }> }` (pending only)

### `POST /api/friend-requests`

- Body JSON:
  - `{ "friendId": string }`
- Behavior:
  - Creates a pending request (or auto-accepts an existing inverse pending request).
- Returns:
  - `{ "request": FriendRequest, "accepted": boolean }`

### `POST /api/friend-requests/:id/accept`

- Behavior:
  - Accepts a pending request (only receiver can accept) and creates mutual friendships.
- Returns:
  - `{ "request": FriendRequest }`

### `POST /api/friend-requests/:id/deny`

- Behavior:
  - Denies a pending request (only receiver can deny).
- Returns:
  - `{ "request": FriendRequest }`

---

## Boards (protected)

### `GET /api/boards`

- Query params:
  - `limit` (default `20`, max `100`)
  - `cursor` (optional ObjectId string)
- Returns:
  - `{ "items": Board[], "nextCursor"?: string }`

### `POST /api/boards`

- Body JSON:
  - `{ "name": string, "description"?: string, "isPublic"?: boolean }`
- Returns:
  - `Board`

### `PATCH /api/boards/:id`

- Path params:
  - `id` (ObjectId string)
- Body JSON (any subset):
  - `{ "name"?: string, "description"?: string, "isPublic"?: boolean, "order"?: number }`
- Returns:
  - `Board`
- Errors:
  - `404 { "error": "Not found" }` if not owned by caller

### `DELETE /api/boards/:id`

- Returns:
  - `{ "success": true }`
- Notes:
  - Deletes the board and associated board-games for that board.

### `POST /api/boards/:id/reorder`

- Body JSON:
  - `{ "order": number }` (integer >= 0)
- Returns:
  - `Board`

---

## Board Games (protected)

### `GET /api/boards/:boardId/board-games`

- Query params:
  - `limit` (default `20`, max `100`)
  - `cursor` (optional ObjectId string)
- Returns:
  - `{ "items": Array<BoardGame & { game: Game | null }>, "nextCursor"?: string }`
- Notes:
  - Performs a manual join to include `game`.

### `POST /api/boards/:boardId/board-games`

- Body JSON:
  - `{ "gameId": string, "status"?: GameStatus, "rating"?: number, "notes"?: string, "platforms"?: string[], "order"?: number }`
- Returns:
  - `BoardGame`
- Notes:
  - Upserts by compound key `(boardId, gameId)`.

### `PATCH /api/boards/:boardId/board-games/:gameId`

- Body JSON (any subset):
  - `{ "status"?: GameStatus, "rating"?: number, "notes"?: string, "platforms"?: string[] }`
- Returns:
  - `BoardGame`

### `DELETE /api/boards/:boardId/board-games/:gameId`

- Returns:
  - `{ "success": true }`

### `POST /api/boards/:boardId/board-games/:gameId/reorder`

- Body JSON:
  - `{ "order": number }` (integer >= 0)
- Returns:
  - `BoardGame`

