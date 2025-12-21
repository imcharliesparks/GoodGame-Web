Yep — here’s a rewritten **Codex CLI prompt** that is explicitly built around:

* **Vercel AI SDK** (`ai` + `@ai-sdk/openai`)
* **OpenAI’s API** (via the AI SDK OpenAI provider)
* **Structured output** (`generateObject` + Zod)
* A clean Next.js App Router **route handler** implementation
* Your existing backend REST APIs + Clerk boundary rules ([AI SDK][1])

It’s long and specific on purpose so Codex produces real, correct code.

---

````md
# TASK: Implement RAG Game Recommendations using Vercel AI SDK + OpenAI

## Project Context (must respect)
- Next.js (App Router) acts as a BFF layer
- Separate Node/Express backend (“Argus”) exposes REST endpoints
- Clerk auth is enforced at the Next.js API boundary; backend trusts `Authorization: Bearer <Clerk JWT>`
- Backend remains AI-agnostic (DO NOT add AI code to backend)
- Existing backend endpoints include:
  - `GET /api/user/me`
  - `GET /api/boards`
  - `GET /api/boards/:boardId/board-games` (includes `game` join)
  - Other game endpoints exist but recommendations should be library-centric first

## Goal
Add a new Next.js API route that accepts a natural-language query and returns a curated list of matching games from the user’s library (RAG: retrieve candidates deterministically, then rank/explain with OpenAI via Vercel AI SDK).

Example user query:
> "I'm feeling like playing an action game tonight. One from my library that I haven't played yet, and make sure it's on PS5 or Switch 2."

## Hard Requirements
1. Use **Vercel AI SDK** for all LLM calls:
   - Install & use `ai` + `@ai-sdk/openai` provider. The OpenAI provider supports OpenAI’s modern APIs. (AI SDK docs)
2. Use OpenAI via AI SDK provider:
   - `import { openai } from '@ai-sdk/openai'`
3. Use **structured extraction** for intent parsing:
   - `generateObject` from `ai`
   - Zod schema validation
4. Retrieval must be deterministic:
   - Fetch from backend REST APIs using the user’s Clerk JWT
   - Filter candidates in TypeScript (NOT with LLM)
5. The LLM must only rank/explain among provided candidates:
   - Never invent games
   - Never output IDs not present in the candidates list
6. Keep changes isolated to Next.js BFF:
   - Put AI code under `app/api/ai/*`
   - Do not modify backend service
7. Provide solid error handling and safe defaults:
   - handle empty library, empty candidates, invalid LLM output, backend errors, etc.

---

## Implementation Plan (what to build)

### A) Dependencies & Env
1. Add dependencies (Bun):
   - `bun add ai @ai-sdk/openai zod`
2. Add required env var:
   - `OPENAI_API_KEY=...`
   - NOTE: Do NOT use Vercel AI Gateway for now; call OpenAI directly with OpenAI API key.
3. Add optional env vars if needed:
   - `ARGUS_URL=...` (or use existing env getter)
   - Ensure existing Clerk JWT template flow remains intact.

### B) New Route Handler
Create:
- `app/api/ai/recommendations/route.ts`

The route:
- Accepts `POST` with JSON body: `{ query: string }`
- Enforces auth using `auth()` from `@clerk/nextjs/server`
- Obtains a JWT for the backend using `getToken({ template: <your-template> })`
- Calls Argus endpoints with `Authorization: Bearer <token>` and `cache: 'no-store'`
- Runs the RAG pipeline:
  1) Intent extraction (LLM #1, structured)
  2) Deterministic candidate retrieval & filtering
  3) Ranking + explanation (LLM #2)
- Returns JSON:
```ts
{
  results: Array<{
    gameId: string;
    title: string;
    reason: string;
  }>;
  debug?: { intent: GameRecommendationIntent; candidateCount: number; } // include only in non-prod
}
````

### C) Intent Schema + Extraction (LLM call #1)

Define Zod schema and TS type:

```ts
import { z } from 'zod';

export const GameRecommendationIntentSchema = z.object({
  genres: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  ownership: z.enum(['OWNED', 'WISHLIST']).optional(),
  playStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  mood: z.enum(['relaxed', 'intense', 'short-session']).optional(),
  maxResults: z.number().int().min(1).max(20).optional()
});

export type GameRecommendationIntent = z.infer<typeof GameRecommendationIntentSchema>;
```

Use AI SDK structured generation:

* `import { generateObject } from 'ai';`
* Provide a system prompt that:

  * converts user query into JSON matching schema
  * omits unknown fields
  * does not add commentary
* Use OpenAI model via AI SDK:

  * `model: openai('gpt-5-mini')` (or a sensible default if repo uses another)
* Ensure validation: the output must pass Zod, otherwise fallback to `{}`.

### D) Candidate Retrieval (Deterministic)

Retrieve the user’s library from backend:

* Identify which board(s) to use:

  * If the caller provides `boardId`, target only that board.
  * Otherwise, fetch all boards and aggregate their games (up to a sane cap) so recommendations draw from everything the user has created.

Fetch board-games:

* `GET /api/boards/:boardId/board-games?limit=100` with cursor pagination until exhausted (or cap at 500).
* Each item is `BoardGame & { game: Game | null }`.

Deterministic filters (in TypeScript):

* Remove items where `game` is null
* Play status logic:

  * interpret `BoardGame.status`:

    * `COMPLETED` => completed
    * `PLAYING` => in progress
    * `OWNED` => not started (unless you have more fields)
* Exclude completed when intent requests NOT_STARTED / IN_PROGRESS
* Genre match:

  * if intent.genres provided: keep if any overlap with `game.genres`
* Platform match:

  * if intent.platforms provided: keep if any overlap with `game.platforms` OR `BoardGame.platforms` if you store user-specific platforms
* Ownership:

  * If `ownership=OWNED`, keep statuses OWNED/PLAYING/COMPLETED (depending on playStatus filter)
  * If `ownership=WISHLIST`, keep WISHLIST

Candidate cap:

* cap to max 20 candidates (or 25) before sending to the LLM ranking step
* choose a deterministic pre-sort before capping:

  * prefer higher metacritic if available
  * prefer recently added
  * prefer not played
  * keep it simple and deterministic

### E) Ranking + Explanation (LLM call #2)

Use AI SDK again:

* Either `generateObject` again with a schema like:

```ts
const RankedResultsSchema = z.object({
  results: z.array(z.object({
    gameId: z.string(),
    reason: z.string().min(1).max(240)
  })).min(0).max(20)
});
```

* Or use `generateText` and then parse — but prefer `generateObject` to avoid brittle parsing (AI SDK supports structured data generation).
* Provide the model:

  * User query
  * Parsed intent (short JSON)
  * Candidate list (id, title, genres, platforms, short description <= 240 chars, user status)
* Rules to the model:

  * You MUST ONLY reference `gameId` values from the provided candidates list
  * Return at most `maxResults` (default 8)
  * One short reason per game, 1–2 sentences
  * Do not mention games that aren’t in the list

Validate the output:

* Ensure every returned `gameId` exists in candidate set; drop invalid ones
* If output is empty or invalid, fallback to deterministic top N candidates with generic reasons

### F) Shared Helpers / Organization

Add small helper modules (keep it boring):

* `lib/ai/openai.ts` to centralize model selection
* `lib/ai/prompts.ts` for the two prompts
* `lib/ai/types.ts` for schemas
* `lib/argus/client.ts` (if you already have an apiFetch) for authenticated calls

But do NOT over-abstract. Keep within 2–4 files max.

### G) Testing / Manual Validation

Add a minimal test plan in a comment or README:

* Queries:

  * “action on ps5 not played”
  * “cozy game for short session switch”
  * “something intense I can finish soon”
* Ensure:

  * no hallucinated games
  * filters work
  * empty states return `{ results: [] }` with helpful message in server logs

---

## Deliverables

1. `app/api/ai/recommendations/route.ts` implemented
2. Minimal AI helper files for:

  * schemas (Zod)
  * prompts
  * OpenAI model configuration
3. Uses Vercel AI SDK (`generateObject`) + `@ai-sdk/openai`
4. No backend changes

## Notes / Provider docs

* Vercel AI SDK: use `generateObject` for structured extraction and `@ai-sdk/openai` for OpenAI models.
* OpenAI: prefer Responses-based models via provider; use modern recommended models.

NOW implement this in the repo, keeping code idiomatic and consistent with the existing project conventions.

```

---

### A couple of small but important implementation choices (so Codex doesn’t go off-road)

- Use **`generateObject` twice** (intent + ranking). It avoids brittle JSON parsing and is exactly what the AI SDK supports for “invisible AI” structured tasks. :contentReference[oaicite:1]{index=1}  
- In Next.js App Router route handlers, follow the AI SDK patterns (`generateText` / `streamText` cookbook style). :contentReference[oaicite:2]{index=2}  
- The OpenAI provider is explicitly documented for AI SDK usage. :contentReference[oaicite:3]{index=3}  

If you want, paste your current env helper / fetch wrapper (`getArgusUrl`, `apiFetch`, etc.) and I’ll tailor the prompt to match your exact code style so Codex lands the changes perfectly on the first run.
::contentReference[oaicite:4]{index=4}
```

[1]: https://ai-sdk.dev/providers/ai-sdk-providers/openai?utm_source=chatgpt.com "OpenAI provider"
