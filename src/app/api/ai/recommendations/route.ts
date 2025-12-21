import { generateObject, generateText } from "ai";
import { NextResponse } from "next/server";

import { INTENT_SYSTEM_PROMPT, RANKING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getGroqModel } from "@/lib/ai/groq";
import { getOpenAiModel } from "@/lib/ai/openai";
import { getProvider, type AiProvider } from "@/lib/ai/provider";
import {
  GameRecommendationIntentSchema,
  RankedRecommendationsSchema,
  type GameRecommendationIntent,
  type RankedRecommendations,
} from "@/lib/ai/types";
import { getBoard, listBoardGames, listBoards } from "@/lib/data/boards";
import type { ApiResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";
import type { BoardGameWithGame } from "@/lib/types/board-game";
import type { Game } from "@/lib/types/game";
import { ArgusHttpError } from "@/lib/argus/http";
import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_PAGE_SIZE = 100;
const MAX_TOTAL_BOARD_GAMES = 500;
const MAX_CANDIDATES = 20;
const DEFAULT_RESULTS = 8;

type RecommendationResult = {
  results: Array<{
    gameId: string;
    title: string;
    reason: string;
    boards: Array<{ id: string; name: string; status?: string }>;
  }>;
  debug?: {
    intent: GameRecommendationIntent;
    candidateCount: number;
    boards: Array<{ id: string; name: string; itemCount: number }>;
    requestedBoardId?: string;
  };
};

export async function POST(request: Request) {
  const authResult = await requireAuthToken();
  if ("error" in authResult) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  const parsedBody = await parseBody(request);
  if ("error" in parsedBody) {
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: parsedBody.error },
      { status: parsedBody.status },
    );
  }

  const provider = getProvider();
  let model: ReturnType<typeof getOpenAiModel> | ReturnType<typeof getGroqModel>;
  try {
    model = provider === "GROQ" ? getGroqModel() : getOpenAiModel();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI provider is not configured.";
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: message },
      { status: 500 },
    );
  }

  const intent = await extractIntent(model, parsedBody.query, provider);

  let boardCollections: BoardCollection[] = [];
  try {
    boardCollections = await loadBoardsWithGames(authResult.token, parsedBody.boardId);
  } catch (error) {
    return respondWithError(error);
  }

  const totalItems = boardCollections.reduce((sum, entry) => sum + entry.items.length, 0);
  if (boardCollections.length === 0 || totalItems === 0) {
    return NextResponse.json<ApiResult<RecommendationResult>>({
      success: true,
      data: {
        results: [],
        debug:
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                intent,
                candidateCount: 0,
                boards: boardCollections.map((entry) => ({
                  id: entry.board.id,
                  name: entry.board.name,
                  itemCount: entry.items.length,
                })),
                requestedBoardId: parsedBody.boardId,
              },
      },
    });
  }

  const candidates = selectCandidates(boardCollections, intent);
  const membershipMap = buildMembershipMap(candidates);
  const cappedCandidates = capCandidates(candidates, parsedBody.boardId);
  const maxResults = Math.min(
    intent.maxResults ?? DEFAULT_RESULTS,
    MAX_CANDIDATES,
    cappedCandidates.length || DEFAULT_RESULTS,
  );

  const ranked = await rankCandidates(
    model,
    parsedBody.query,
    intent,
    cappedCandidates,
    maxResults,
    provider,
  );

  const results = validateRankedResults(
    ranked,
    cappedCandidates,
    maxResults,
    parsedBody.boardId,
    membershipMap,
  );

  return NextResponse.json<ApiResult<RecommendationResult>>({
    success: true,
    data: {
      results,
      debug:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              intent,
              candidateCount: cappedCandidates.length,
              boards: boardCollections.map((entry) => ({
                id: entry.board.id,
                name: entry.board.name,
                itemCount: entry.items.length,
              })),
              requestedBoardId: parsedBody.boardId,
            },
    },
  });
}

async function parseBody(
  request: Request,
): Promise<{ query: string; boardId?: string } | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const query = payload.query;
  const boardIdRaw = payload.boardId;
  const boardId =
    typeof boardIdRaw === "string" && boardIdRaw.trim().length > 0 ? boardIdRaw.trim() : undefined;

  if (typeof query !== "string" || query.trim().length === 0) {
    return { error: "Query is required.", status: 400 };
  }

  return { query: query.trim(), boardId };
}

type BoardCollection = { board: Board; items: BoardGameWithGame[] };

async function loadBoardsWithGames(token: string, boardId?: string): Promise<BoardCollection[]> {
  const boards = await selectBoards(token, boardId);
  if (boards.length === 0) return [];

  const collections: BoardCollection[] = [];
  let remainingBudget = MAX_TOTAL_BOARD_GAMES;

  for (const board of boards) {
    if (remainingBudget <= 0) break;
    const items = await collectBoardGames(board.id, token, remainingBudget);
    remainingBudget -= items.length;
    collections.push({ board, items });
  }

  return collections;
}

async function selectBoards(token: string, boardId?: string) {
  if (boardId) {
    try {
      const board = await getBoard(boardId, { token, cache: "no-store" });
      return [board];
    } catch (error) {
      const status =
        error instanceof ArgusHttpError
          ? error.status
          : error instanceof Response
            ? error.status
            : undefined;
      const message =
        error instanceof Error ? error.message : "Unable to fetch the requested board.";

      if (status === 401 || status === 403) {
        throw NextResponse.json<ApiResult<null>>(
          { success: false, error: "You do not have access to this board." },
          { status: 403 },
        );
      }

      if (status === 404) {
        throw NextResponse.json<ApiResult<null>>(
          { success: false, error: "Board not found." },
          { status: 404 },
        );
      }

      throw NextResponse.json<ApiResult<null>>(
        { success: false, error: message },
        { status: status ?? 500 },
      );
    }
  }

  return collectBoards(token);
}

async function collectBoards(token: string) {
  const boards: Board[] = [];
  let cursor: string | undefined;

  do {
    const page = await listBoards(
      { limit: BOARD_PAGE_SIZE, cursor },
      { token, cache: "no-store" },
    );
    boards.push(...page.items);
    cursor = "nextCursor" in page ? page.nextCursor : undefined;
  } while (cursor);

  return boards;
}

async function collectBoardGames(boardId: string, token: string, budget = MAX_TOTAL_BOARD_GAMES) {
  const items: BoardGameWithGame[] = [];
  let cursor: string | undefined;

  if (budget <= 0) return items;

  do {
    const limit = Math.min(BOARD_PAGE_SIZE, budget - items.length);
    if (limit <= 0) break;

    const page = await listBoardGames(
      { boardId, limit, cursor },
      { token, cache: "no-store" },
    );
    items.push(...page.items);
    cursor = "nextCursor" in page ? page.nextCursor : undefined;
  } while (cursor && items.length < budget);

  return items;
}

async function extractIntent(
  model: ReturnType<typeof getOpenAiModel> | ReturnType<typeof getGroqModel>,
  query: string,
  provider: AiProvider,
) {
  if (provider === "GROQ") {
    return extractIntentGroq(model, query);
  }

  try {
    const result = await generateObject({
      model,
      schema: GameRecommendationIntentSchema,
      system: INTENT_SYSTEM_PROMPT,
      prompt: `User request:\n${query}`,
    });

    return result.object ?? {};
  } catch (error) {
    console.error("Intent extraction failed", error);
    return {};
  }
}

type Candidate = {
  game: Game;
  item: BoardGameWithGame;
  playState: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  platforms: string[];
  board: Board;
};

type MembershipMap = Map<
  string,
  Array<{
    id: string;
    name: string;
    status?: string;
  }>
>;

async function extractIntentGroq(
  model: ReturnType<typeof getGroqModel>,
  query: string,
): Promise<GameRecommendationIntent> {
  try {
    const prompt = [
      "You extract intent for game recommendations.",
      "Respond with 6 lines in this exact order:",
      "genres: comma-separated values or none",
      "platforms: comma-separated values or none",
      "ownership: owned|wishlist|unknown",
      "playstatus: not_started|in_progress|completed|unknown",
      "mood: relaxed|intense|short-session|unknown",
      "maxResults: integer 1-20 or blank",
      `User query: ${query}`,
    ].join("\n");

    const result = await generateText({
      model,
      system: "Parse the request and emit only the 6 lines in the specified format.",
      prompt,
    });

    return parseGroqIntent(result.text);
  } catch (error) {
    console.error("Groq intent extraction failed", error);
    return {};
  }
}

function parseGroqIntent(text: string): GameRecommendationIntent {
  const intent: GameRecommendationIntent = {};
  const lines = text.split("\n").map((line) => line.trim());
  for (const line of lines) {
    if (!line.includes(":")) continue;
    const [rawKey, rawValue] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rawValue?.trim() ?? "";
    if (!value || value.toLowerCase() === "none" || value.toLowerCase() === "unknown") continue;

    if (key === "genres" || key === "platforms") {
      const parts = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        if (key === "genres") intent.genres = parts;
        else intent.platforms = parts;
      }
    } else if (key === "ownership") {
      const normalized = value.toUpperCase();
      if (normalized === "OWNED" || normalized === "WISHLIST") {
        intent.ownership = normalized;
      }
    } else if (key === "playstatus") {
      const normalized = value.toUpperCase();
      if (normalized === "NOT_STARTED" || normalized === "IN_PROGRESS" || normalized === "COMPLETED") {
        intent.playStatus = normalized as GameRecommendationIntent["playStatus"];
      }
    } else if (key === "mood") {
      const normalized = value.toLowerCase();
      if (normalized === "relaxed" || normalized === "intense" || normalized === "short-session") {
        intent.mood = normalized as GameRecommendationIntent["mood"];
      }
    } else if (key === "maxresults" || key === "max") {
      const num = Number.parseInt(value, 10);
      if (Number.isFinite(num) && num >= 1 && num <= 20) {
        intent.maxResults = num;
      }
    }
  }

  return intent;
}

function selectCandidates(
  collections: BoardCollection[],
  intent: GameRecommendationIntent,
) {
  const candidates: Candidate[] = [];

  for (const collection of collections) {
    for (const item of collection.items) {
      if (!item.game) continue;

      const playState = normalizePlayState(item.status);
      if (intent.playStatus && intent.playStatus !== playState) continue;

      if (intent.ownership === "WISHLIST" && item.status !== "WISHLIST") continue;
      if (intent.ownership === "OWNED" && item.status === "WISHLIST") continue;

      const platforms = mergePlatforms(item.game.platforms, item.platforms);
      if (
        intent.platforms &&
        intent.platforms.length > 0 &&
        !hasOverlap(intent.platforms, platforms, { aliasMap: PLATFORM_ALIASES })
      ) {
        continue;
      }

      if (intent.genres && intent.genres.length > 0) {
        // Prefer strict genre/tag matches to avoid false positives from publisher/developer names.
        const primaryGenreFields = [...item.game.genres, ...item.game.tags];
        const hasPrimaryMatch = hasOverlap(intent.genres, primaryGenreFields);

        if (!hasPrimaryMatch) {
          const shouldUseFallback =
            intent.includeRelatedFields === true;
          const fallbackFields = shouldUseFallback
            ? [...item.game.publishers, ...item.game.developers]
            : [];
          if (!hasOverlap(intent.genres, fallbackFields)) {
            continue;
          }
        }
      }

      candidates.push({ game: item.game, item, playState, platforms, board: collection.board });
    }
  }

  return candidates;
}

function capCandidates(candidates: Candidate[], primaryBoardId?: string) {
  const sorted = [...candidates].sort((a, b) => {
    const boardPriority = primaryBoardId
      ? Number(b.board.id === primaryBoardId) - Number(a.board.id === primaryBoardId)
      : 0;
    if (boardPriority !== 0) return boardPriority;

    const statusRank = statusPriority(a.item.status) - statusPriority(b.item.status);
    if (statusRank !== 0) return statusRank;

    const boardRank = boardOrder(a.board) - boardOrder(b.board);
    if (boardRank !== 0) return boardRank;

    const metacriticA = a.game.metacritic ?? -1;
    const metacriticB = b.game.metacritic ?? -1;
    if (metacriticA !== metacriticB) return metacriticB - metacriticA;

    const addedA = new Date(a.item.addedAt).getTime();
    const addedB = new Date(b.item.addedAt).getTime();
    if (!Number.isNaN(addedA) && !Number.isNaN(addedB) && addedA !== addedB) {
      return addedB - addedA;
    }

    return a.game.title.localeCompare(b.game.title);
  });

  // Deduplicate by gameId across boards, keeping the best-ranked occurrence.
  const seen = new Set<string>();
  const deduped: Candidate[] = [];
  for (const candidate of sorted) {
    if (deduped.length >= MAX_CANDIDATES) break;
    if (seen.has(candidate.game.id)) continue;
    seen.add(candidate.game.id);
    deduped.push(candidate);
  }

  return deduped;
}

function buildMembershipMap(candidates: Candidate[]): MembershipMap {
  const membership: MembershipMap = new Map();

  for (const candidate of candidates) {
    const list = membership.get(candidate.game.id) ?? [];
    if (!list.some((entry) => entry.id === candidate.board.id)) {
      list.push({ id: candidate.board.id, name: candidate.board.name, status: candidate.item.status });
    }
    membership.set(candidate.game.id, list);
  }

  return membership;
}

type RankingOutput = { results: Array<{ gameId: string; reason: string }> };

async function rankCandidates(
  model: ReturnType<typeof getOpenAiModel> | ReturnType<typeof getGroqModel>,
  query: string,
  intent: GameRecommendationIntent,
  candidates: Candidate[],
  maxResults: number,
  provider: AiProvider,
): Promise<RankingOutput | undefined> {
  if (candidates.length === 0) return { results: [] };

  if (provider === "GROQ") {
    return rankWithGroq(model as ReturnType<typeof getGroqModel>, query, intent, candidates, maxResults);
  }

  const prompt = buildRankingPrompt(query, intent, candidates, maxResults);

  try {
    const result = await generateObject({
      model,
      schema: RankedRecommendationsSchema,
      system: RANKING_SYSTEM_PROMPT,
      prompt,
    });

    return result.object;
  } catch (error) {
    console.error("Ranking failed", error);
    return undefined;
  }
}

function buildRankingPrompt(
  query: string,
  intent: GameRecommendationIntent,
  candidates: Candidate[],
  maxResults: number,
) {
  const intentJson = JSON.stringify(intent ?? {});
  const candidateLines = candidates
    .map((candidate, index) => {
      const summary = truncate(candidate.game.description ?? "", 240);
      const genres = candidate.game.genres.join(", ") || "unknown";
      const platforms = candidate.platforms.join(", ") || "unknown";
      const status = candidate.item.status;
      const playState = candidate.playState;
      const metacritic =
        candidate.game.metacritic !== undefined
          ? `metacritic: ${candidate.game.metacritic}`
          : "metacritic: n/a";
      const boardName = candidate.board.name ?? "board";

      return `${index + 1}. ${candidate.game.title} (gameId: ${candidate.game.id}; board: ${boardName}; status: ${status}; playState: ${playState}; platforms: ${platforms}; genres: ${genres}; ${metacritic}; summary: ${summary})`;
    })
    .join("\n");

  return [
    `User query: ${query}`,
    `Parsed intent JSON: ${intentJson}`,
    `You must pick up to ${maxResults} games from the candidate list below. Only reference provided gameIds and keep reasons concise (1-2 sentences).`,
    `Candidates:`,
    candidateLines,
  ].join("\n");
}

function buildGroqRankingPrompt(
  query: string,
  intent: GameRecommendationIntent,
  candidates: Candidate[],
  maxResults: number,
) {
  const intentJson = JSON.stringify(intent ?? {});
  const candidateLines = candidates
    .map((candidate) => {
      const summary = truncate(candidate.game.description ?? "", 200);
      const genres = candidate.game.genres.join(", ") || "unknown";
      const platforms = candidate.platforms.join(", ") || "unknown";
      const status = candidate.item.status;
      const playState = candidate.playState;
      const metacritic =
        candidate.game.metacritic !== undefined
          ? `metacritic ${candidate.game.metacritic}`
          : "metacritic n/a";
      const boardName = candidate.board.name ?? "board";

      return `gameId=${candidate.game.id} | title=${candidate.game.title} | board=${boardName} | status=${status} | play=${playState} | platforms=${platforms} | genres=${genres} | ${metacritic} | summary=${summary}`;
    })
    .join("\n");

  return [
    `User query: ${query}`,
    `Parsed intent JSON: ${intentJson}`,
    `You must pick up to ${maxResults} games from the candidate list below.`,
    `Format: each line -> gameId=<id> | reason=<one short reason>`,
    `Only use provided gameIds. Keep reasons to 1-2 sentences.`,
    `Candidates:`,
    candidateLines,
  ].join("\n");
}

function validateRankedResults(
  ranked: RankingOutput | undefined,
  candidates: Candidate[],
  maxResults: number,
  primaryBoardId?: string,
  membershipMap?: MembershipMap,
) {
  if (candidates.length === 0) return [];

  const candidateMap = new Map<string, Candidate>();
  for (const candidate of candidates) {
    candidateMap.set(candidate.game.id, candidate);
  }

  const rankedResults = ranked?.results ?? [];
  const valid = [];

  for (const entry of rankedResults) {
    if (valid.length >= maxResults) break;
    const candidate = candidateMap.get(entry.gameId);
    if (!candidate) continue;

    const reason = entry.reason.trim();
    if (reason.length === 0) continue;

    valid.push({
      gameId: candidate.game.id,
      title: candidate.game.title,
      reason,
      boards: membershipMap?.get(candidate.game.id) ?? [
        { id: candidate.board.id, name: candidate.board.name, status: candidate.item.status },
      ],
    });
  }

  if (valid.length > 0) {
    if (primaryBoardId) {
      valid.sort((a, b) => {
        const aCandidate = candidateMap.get(a.gameId);
        const bCandidate = candidateMap.get(b.gameId);
        const aPrimary = aCandidate?.board.id === primaryBoardId;
        const bPrimary = bCandidate?.board.id === primaryBoardId;
        if (aPrimary === bPrimary) return 0;
        return aPrimary ? -1 : 1;
      });
    }
    return valid;
  }

  return deterministicFallback(candidates, maxResults, membershipMap);
}

function deterministicFallback(
  candidates: Candidate[],
  maxResults: number,
  membershipMap?: MembershipMap,
) {
  const fallback = candidates.slice(0, maxResults);
  return fallback.map((candidate) => ({
    gameId: candidate.game.id,
    title: candidate.game.title,
    reason: "Matches your request and is already in your boards.",
    boards: membershipMap?.get(candidate.game.id) ?? [
      { id: candidate.board.id, name: candidate.board.name, status: candidate.item.status },
    ],
  }));
}

function normalizePlayState(
  status: BoardGameWithGame["status"],
): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" {
  if (status === "PLAYING") return "IN_PROGRESS";
  if (status === "COMPLETED") return "COMPLETED";
  return "NOT_STARTED";
}

function statusPriority(status: BoardGameWithGame["status"]) {
  switch (status) {
    case "PLAYING":
      return 0;
    case "OWNED":
      return 1;
    case "WISHLIST":
      return 2;
    case "COMPLETED":
      return 3;
    default:
      return 4;
  }
}

const PLATFORM_ALIASES: Record<string, string[]> = {
  ps5: ["ps5", "playstation 5"],
  ps4: ["ps4", "playstation 4"],
  "xbox-series": ["xbox series x", "xbox series s", "series x", "series s", "xsx", "xss"],
  "xbox-one": ["xbox one", "xbone"],
  switch: ["switch", "nintendo switch"],
  pc: ["pc", "windows"],
  mac: ["mac", "macos", "os x", "osx"],
  linux: ["linux"],
};

type OverlapOptions = { aliasMap?: Record<string, string[]> };

function hasOverlap(a: string[], b: string[], options: OverlapOptions = {}) {
  const normalize = (value: string) => value.trim().toLowerCase();
  const listA = a.map(normalize);
  const listB = b.map(normalize);
  const aliasGroups = options.aliasMap ? buildAliasGroups(options.aliasMap) : [];

  for (const left of listA) {
    for (const right of listB) {
      // Exact match
      if (left === right) return true;

      // Alias group match
      if (inSameAliasGroup(left, right, aliasGroups)) return true;

      // Controlled substring match: only for sufficiently long tokens to avoid short collisions
      const longEnough = left.length >= 3 && right.length >= 3;
      if (longEnough && (left.includes(right) || right.includes(left))) {
        return true;
      }
    }
  }

  return false;
}

function buildAliasGroups(aliasMap: Record<string, string[]>) {
  return Object.values(aliasMap).map((group) => group.map((value) => value.trim().toLowerCase()));
}

function inSameAliasGroup(left: string, right: string, groups: string[][]) {
  return groups.some((group) => group.includes(left) && group.includes(right));
}

function mergePlatforms(base: string[], overrides?: string[]) {
  const merged = new Set<string>();
  for (const value of base ?? []) merged.add(value);
  for (const value of overrides ?? []) merged.add(value);
  return Array.from(merged);
}

function boardOrder(board: Board) {
  const maybeRecord = board as unknown as Record<string, unknown>;
  if ("order" in maybeRecord && typeof maybeRecord.order === "number") {
    return maybeRecord.order;
  }
  return Number.MAX_SAFE_INTEGER;
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3)}...`;
}

async function rankWithGroq(
  model: ReturnType<typeof getGroqModel>,
  query: string,
  intent: GameRecommendationIntent,
  candidates: Candidate[],
  maxResults: number,
): Promise<RankingOutput | undefined> {
  const prompt = buildGroqRankingPrompt(query, intent, candidates, maxResults);

  try {
    const result = await generateText({
      model,
      system: [
        "Rank the provided games. Only use gameIds provided.",
        "Return one line per recommendation using: gameId=<id> | reason=<short reason>",
      ].join("\n"),
      prompt,
    });

    return { results: parseGroqRanking(result.text, maxResults) };
  } catch (error) {
    console.error("Groq ranking failed", error);
    return undefined;
  }
}

function parseGroqRanking(text: string, maxResults: number): Array<{ gameId: string; reason: string }> {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const results: Array<{ gameId: string; reason: string }> = [];

  for (const line of lines) {
    if (results.length >= maxResults) break;
    const match = line.match(/gameId\s*=\s*([^|]+)\|\s*reason\s*=\s*(.+)/i);
    if (!match) continue;
    const gameId = match[1].trim();
    const reason = match[2].trim();
    if (!gameId || !reason) continue;
    results.push({ gameId, reason });
  }

  return results;
}
