# RAG (Curator) Implementation Overview

This doc describes how the GoodGame web app implements Retrieval-Augmented Generation for personalized game recommendations (“Curator”). The backend (Argus) remains AI-agnostic; all AI logic lives in the Next.js BFF.

## High-Level Flow
1. **Auth boundary (Clerk):** Next.js API route ensures a signed-in user and mints a Clerk JWT for Argus (`Authorization: Bearer <token>`).
2. **Deterministic retrieval (Argus REST):**
   - Fetch boards (or a specific board if `boardId` is provided to the route).
   - Fetch board-games for each included board (paginated, `cache: 'no-store'`), joined with game metadata.
   - Filter/cap candidates locally in TypeScript—no LLM retrieval.
3. **Intent extraction (LLM #1):**
   - OpenAI provider: `generateObject` with Zod schema (`GameRecommendationIntentSchema`).
   - Groq provider: plain-text `generateText` with a lightweight parser (no JSON schema).
4. **Ranking (LLM #2):**
   - OpenAI: `generateObject` with structured output schema.
   - Groq: plain-text ranking parsed from “gameId=… | reason=…” lines.
   - Validation drops unknown IDs; falls back to deterministic top picks if needed.
5. **Response shape (API):**
   ```ts
   {
     results: Array<{ gameId: string; title: string; reason: string }>;
     debug?: { intent: GameRecommendationIntent; candidateCount: number; boardId?: string; boardName?: string };
   }
   ```
   `debug` is omitted in production.

## Files and Responsibilities
- `src/app/api/ai/recommendations/route.ts` — Main API route; auth, retrieval, intent, ranking, validation.
- `src/lib/ai/types.ts` — Zod schemas for intent and ranked results.
- `src/lib/ai/prompts.ts` — System prompts for intent/ranking (OpenAI path).
- `src/lib/ai/provider.ts` — Reads `CURRENT_RAG_PROVIDER` (OPENAI|GROQ).
- `src/lib/ai/openai.ts` — OpenAI model helper.
- `src/lib/ai/groq.ts` — Groq model helper.
- `src/lib/data/boards.ts` — Argus data access (with `cache` options).
- `src/lib/types/*` — Shared types for games/boards/API.
- `src/app/ai/recommendations/page.tsx` — Curator UI (chat-style), hydrates game details, renders cards.
- `src/components/games/search/GameResultsGrid.tsx` — Game cards with “why” reasons from Curator.
- `src/lib/client/recommendations.ts` — Client fetcher for Curator API.

## Provider Selection & Models
- Env `CURRENT_RAG_PROVIDER`:
  - `OPENAI` (default): uses `gpt-4o-mini` via `@ai-sdk/openai` with structured outputs.
  - `GROQ`: uses Groq via `@ai-sdk/groq`; default model `llama-3.3-70b-versatile`. Override with `GROQ_MODEL` if desired.
- Required keys:
  - `OPENAI_API_KEY` for OpenAI
  - `GROQ_API_KEY` for Groq
- Argus/Clerk env must also be set (`ARGUS_URL`, `CLERK_JWT_TEMPLATE_NAME`, Clerk keys).

## Retrieval & Filtering Rules
- **Board selection:** Accepts optional `boardId` to target a single board; otherwise aggregates across all boards (up to a total cap).
- **Pagination caps:** Boards page size 100; board-games page size 100; cap at 500 items.
- **Candidate filters:**
  - Exclude items with `game` null.
  - Ownership: `WISHLIST` vs owned (owned = OWNED/PLAYING/COMPLETED).
  - Play status: maps PLAYING→IN_PROGRESS, COMPLETED→COMPLETED, others→NOT_STARTED.
  - Platforms: overlap check (partial, case-insensitive) against merged game + board-game platforms.
  - Genres/tags/publishers/developers: partial overlap against all these fields.
- **Deterministic ordering before LLM:** PLAYING first, then OWNED, WISHLIST, COMPLETED; then higher metacritic; then recently added; then title ASC. Cap to 20 candidates before ranking.

## LLM Steps
### Intent (OpenAI)
- `generateObject` + `GameRecommendationIntentSchema` (genres, platforms, ownership, playStatus, mood, maxResults).
- System prompt: extract JSON only, omit commentary. Fall back to `{}` on errors.

### Intent (Groq)
- `generateText` with a fixed 6-line format; parsed into intent (partial/case-insensitive).

### Ranking (OpenAI)
- `generateObject` with `RankedRecommendationsSchema`, provided user query, intent JSON, and candidate list.
- Enforced rules: only provided gameIds, 1–2 sentence reasons, capped by maxResults (default 8).

### Ranking (Groq)
- `generateText` with prompt to return lines `gameId=<id> | reason=<short reason>`.
- Parser validates IDs and trims to maxResults.

### Validation & Fallback
- Drop any ranked result whose gameId isn’t in candidates or has empty reason.
- If none remain, fall back to deterministic top candidates with a generic reason.

## Response & UI
- API returns `results` with `gameId`, `title`, `reason`; optional `debug` outside production.
- UI (`/ai/recommendations`) hydrates full game data via `/api/games/:id` before rendering cards.
- Cards reuse search UI, showing the model-provided “why” reason beneath each game.

## Usage Notes
- Set required envs: `ARGUS_URL`, Clerk keys, `CLERK_JWT_TEMPLATE_NAME`, and `OPENAI_API_KEY` or `GROQ_API_KEY` (+ `CURRENT_RAG_PROVIDER`, optional `GROQ_MODEL`).
- If no boards have games, the response will be empty.
- Structured outputs are only used on OpenAI; Groq uses plain-text parsing to avoid `json_schema` limitations.

