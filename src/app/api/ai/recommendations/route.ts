import { generateObject } from "ai";
import { NextResponse } from "next/server";

import { INTENT_SYSTEM_PROMPT, RANKING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getDefaultModel } from "@/lib/ai/openai";
import {
  GameRecommendationIntentSchema,
  RankedRecommendationsSchema,
  type GameRecommendationIntent,
  type RankedRecommendations,
} from "@/lib/ai/types";
import { listBoardGames, listBoards } from "@/lib/data/boards";
import type { ApiResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";
import type { BoardGameWithGame } from "@/lib/types/board-game";
import type { Game } from "@/lib/types/game";
import { requireAuthToken } from "../../_lib/auth";
import { respondWithError } from "../../_lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_PAGE_SIZE = 100;
const MAX_BOARD_GAMES = 500;
const MAX_CANDIDATES = 20;
const DEFAULT_RESULTS = 8;

type RecommendationResult = {
  results: Array<{ gameId: string; title: string; reason: string }>;
  debug?: {
    intent: GameRecommendationIntent;
    candidateCount: number;
    boardId?: string;
    boardName?: string;
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

  let model: ReturnType<typeof getDefaultModel>;
  try {
    model = getDefaultModel();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OPENAI_API_KEY is not configured.";
    return NextResponse.json<ApiResult<null>>(
      { success: false, error: message },
      { status: 500 },
    );
  }

  const intent = await extractIntent(model, parsedBody.query);

  let board: Board | undefined;
  let libraryItems: BoardGameWithGame[] = [];
  try {
    const library = await loadLibrary(authResult.token);
    board = library.board;
    libraryItems = library.items;
  } catch (error) {
    return respondWithError(error);
  }

  if (!board || libraryItems.length === 0) {
    return NextResponse.json<ApiResult<RecommendationResult>>({
      success: true,
      data: {
        results: [],
        debug:
          process.env.NODE_ENV === "production"
            ? undefined
            : { intent, candidateCount: 0, boardId: board?.id, boardName: board?.name },
      },
    });
  }

  const candidates = selectCandidates(libraryItems, intent);
  const cappedCandidates = capCandidates(candidates);
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
  );

  const results = validateRankedResults(ranked, cappedCandidates, maxResults);

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
              boardId: board.id,
              boardName: board.name,
            },
    },
  });
}

async function parseBody(
  request: Request,
): Promise<{ query: string } | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }

  const query = typeof body === "object" && body !== null ? (body as Record<string, unknown>).query : undefined;
  if (typeof query !== "string" || query.trim().length === 0) {
    return { error: "Query is required.", status: 400 };
  }

  return { query: query.trim() };
}

async function loadLibrary(token: string) {
  const boards = await collectBoards(token);
  const board = pickLibraryBoard(boards);
  if (!board) return { board: undefined, items: [] as BoardGameWithGame[] };

  const items = await collectBoardGames(board.id, token);
  return { board, items };
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
    cursor = page.nextCursor;
  } while (cursor && boards.length < MAX_BOARD_GAMES);

  return boards;
}

async function collectBoardGames(boardId: string, token: string) {
  const items: BoardGameWithGame[] = [];
  let cursor: string | undefined;

  do {
    const page = await listBoardGames(
      { boardId, limit: BOARD_PAGE_SIZE, cursor },
      { token, cache: "no-store" },
    );
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && items.length < MAX_BOARD_GAMES);

  return items;
}

function pickLibraryBoard(boards: Board[]) {
  if (boards.length === 0) return undefined;
  const named = boards.find(
    (board) => board.name.trim().toLowerCase() === "library",
  );
  return named ?? boards[0];
}

async function extractIntent(model: ReturnType<typeof getDefaultModel>, query: string) {
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
};

function selectCandidates(
  items: BoardGameWithGame[],
  intent: GameRecommendationIntent,
) {
  const candidates: Candidate[] = [];

  for (const item of items) {
    if (!item.game) continue;

    const playState = normalizePlayState(item.status);
    if (intent.playStatus && intent.playStatus !== playState) continue;

    if (intent.ownership === "WISHLIST" && item.status !== "WISHLIST") continue;
    if (intent.ownership === "OWNED" && item.status === "WISHLIST") continue;

    const platforms = mergePlatforms(item.game.platforms, item.platforms);
    if (
      intent.platforms &&
      intent.platforms.length > 0 &&
      !hasOverlap(intent.platforms, platforms)
    ) {
      continue;
    }

    if (
      intent.genres &&
      intent.genres.length > 0 &&
      !hasOverlap(intent.genres, item.game.genres)
    ) {
      continue;
    }

    candidates.push({ game: item.game, item, playState, platforms });
  }

  return candidates;
}

function capCandidates(candidates: Candidate[]) {
  const sorted = [...candidates].sort((a, b) => {
    const statusRank = statusPriority(a.item.status) - statusPriority(b.item.status);
    if (statusRank !== 0) return statusRank;

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

  return sorted.slice(0, MAX_CANDIDATES);
}

async function rankCandidates(
  model: ReturnType<typeof getDefaultModel>,
  query: string,
  intent: GameRecommendationIntent,
  candidates: Candidate[],
  maxResults: number,
): Promise<RankedRecommendations | undefined> {
  if (candidates.length === 0) return { results: [] };

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

      return `${index + 1}. ${candidate.game.title} (gameId: ${candidate.game.id}; status: ${status}; playState: ${playState}; platforms: ${platforms}; genres: ${genres}; ${metacritic}; summary: ${summary})`;
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

function validateRankedResults(
  ranked: RankedRecommendations | undefined,
  candidates: Candidate[],
  maxResults: number,
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
    });
  }

  if (valid.length > 0) return valid;

  return deterministicFallback(candidates, maxResults);
}

function deterministicFallback(candidates: Candidate[], maxResults: number) {
  const fallback = candidates.slice(0, maxResults);
  return fallback.map((candidate) => ({
    gameId: candidate.game.id,
    title: candidate.game.title,
    reason: "Matches your request and is already in your library.",
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

function hasOverlap(a: string[], b: string[]) {
  const setA = new Set(a.map((value) => value.toLowerCase()));
  return b.some((value) => setA.has(value.toLowerCase()));
}

function mergePlatforms(base: string[], overrides?: string[]) {
  const merged = new Set<string>();
  for (const value of base ?? []) merged.add(value);
  for (const value of overrides ?? []) merged.add(value);
  return Array.from(merged);
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3)}...`;
}
