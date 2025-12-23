import { argusRequestJson } from "@/lib/argus/http";
import type { PaginatedResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";
import type {
  BoardGame,
  BoardGameWithGame,
  GameStatus,
} from "@/lib/types/board-game";

export type ArgusCallOptions = {
  token?: string;
  cache?: RequestCache;
};

export type BoardListInput = {
  limit: number;
  cursor?: string;
};

export type UserBoardListInput = {
  userId: string;
  limit: number;
  cursor?: string;
  visibility?: "public" | "private" | "all";
};

export type CreateBoardInput = {
  name: string;
  description?: string;
  isPublic?: boolean;
};

export type UpdateBoardInput = {
  id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  order?: number;
};

export type ReorderBoardInput = {
  id: string;
  order: number;
};

export type BoardGameListInput = {
  boardId: string;
  limit: number;
  cursor?: string;
};

export type AddBoardGameInput = {
  boardId: string;
  gameId: string;
  status?: GameStatus;
  platforms?: string[];
  rating?: number;
  notes?: string;
  order?: number;
};

export type UpdateBoardGameInput = {
  boardId: string;
  gameId: string;
  status?: GameStatus;
  platforms?: string[];
  rating?: number;
  notes?: string;
};

export type ReorderBoardGameInput = {
  boardId: string;
  gameId: string;
  order: number;
};

export async function getBoard(id: string, options: ArgusCallOptions = {}) {
  return argusRequestJson<Board>({
    path: `/api/boards/${encodeURIComponent(id)}`,
    token: options.token,
  });
}

export async function listBoards(
  input: BoardListInput,
  options: ArgusCallOptions = {},
) {
  const data = await argusRequestJson<
    PaginatedResult<Board> & { nextCursor?: string | null }
  >({
    path: "/api/boards",
    token: options.token,
    cache: options.cache,
    query: {
      limit: input.limit,
      cursor: input.cursor,
    },
  });

  const { nextCursor: rawNextCursor, ...rest } = data;
  const nextCursor =
    typeof rawNextCursor === "string" && rawNextCursor.length > 0
      ? rawNextCursor
      : undefined;

  return nextCursor ? { ...rest, nextCursor } : rest;
}

export async function listBoardsByUser(
  input: UserBoardListInput,
  options: ArgusCallOptions = {},
) {
  const data = await argusRequestJson<
    PaginatedResult<Board> & { nextCursor?: string | null }
  >({
    path: `/api/users/${encodeURIComponent(input.userId)}/boards`,
    token: options.token,
    cache: options.cache,
    query: {
      limit: input.limit,
      cursor: input.cursor,
      visibility: input.visibility ?? "public",
    },
  });

  const { nextCursor: rawNextCursor, ...rest } = data;
  const nextCursor =
    typeof rawNextCursor === "string" && rawNextCursor.length > 0
      ? rawNextCursor
      : undefined;

  return nextCursor ? { ...rest, nextCursor } : rest;
}

export async function createBoard(
  input: CreateBoardInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<Board>({
    path: "/api/boards",
    method: "POST",
    token: options.token,
    cache: options.cache,
    body: input,
  });
}

export async function updateBoard(
  input: UpdateBoardInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<Board>({
    path: `/api/boards/${encodeURIComponent(input.id)}`,
    method: "PATCH",
    token: options.token,
    cache: options.cache,
    body: {
      name: input.name,
      description: input.description,
      isPublic: input.isPublic,
      order: input.order,
    },
  });
}

export async function deleteBoard(
  id: string,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ success: boolean }>({
    path: `/api/boards/${encodeURIComponent(id)}`,
    method: "DELETE",
    token: options.token,
    cache: options.cache,
  });
}

export async function reorderBoard(
  input: ReorderBoardInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<Board>({
    path: `/api/boards/${encodeURIComponent(input.id)}/reorder`,
    method: "POST",
    token: options.token,
    cache: options.cache,
    body: { order: input.order },
  });
}

export async function listBoardGames(
  input: BoardGameListInput,
  options: ArgusCallOptions = {},
) {
  const data = await argusRequestJson<
    PaginatedResult<BoardGameWithGame> & { nextCursor?: string | null }
  >({
    path: `/api/boards/${encodeURIComponent(input.boardId)}/board-games`,
    token: options.token,
    cache: options.cache,
    query: {
      limit: input.limit,
      cursor: input.cursor,
    },
  });

  const { nextCursor: rawNextCursor, ...rest } = data;
  const nextCursor =
    typeof rawNextCursor === "string" && rawNextCursor.length > 0
      ? rawNextCursor
      : undefined;

  return nextCursor ? { ...rest, nextCursor } : rest;
}

export async function addBoardGame(
  input: AddBoardGameInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<BoardGame>({
    path: `/api/boards/${encodeURIComponent(input.boardId)}/board-games`,
    method: "POST",
    token: options.token,
    cache: options.cache,
    body: {
      gameId: input.gameId,
      status: input.status,
      platforms: input.platforms,
      rating: input.rating,
      notes: input.notes,
      order: input.order,
    },
  });
}

export async function updateBoardGame(
  input: UpdateBoardGameInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<BoardGame>({
    path: `/api/boards/${encodeURIComponent(input.boardId)}/board-games/${encodeURIComponent(input.gameId)}`,
    method: "PATCH",
    token: options.token,
    cache: options.cache,
    body: {
      status: input.status,
      platforms: input.platforms,
      rating: input.rating,
      notes: input.notes,
    },
  });
}

export async function deleteBoardGame(
  boardId: string,
  gameId: string,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ success: boolean }>({
    path: `/api/boards/${encodeURIComponent(boardId)}/board-games/${encodeURIComponent(gameId)}`,
    method: "DELETE",
    token: options.token,
    cache: options.cache,
  });
}

export async function reorderBoardGame(
  input: ReorderBoardGameInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<BoardGame>({
    path: `/api/boards/${encodeURIComponent(input.boardId)}/board-games/${encodeURIComponent(input.gameId)}/reorder`,
    method: "POST",
    token: options.token,
    cache: options.cache,
    body: { order: input.order },
  });
}
