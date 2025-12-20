"use client";

import { apiFetch } from "./api";
import type { PaginatedResult } from "@/lib/types/api";
import type { Board } from "@/lib/types/board";
import type { BoardGame, BoardGameWithGame, GameStatus } from "@/lib/types/board-game";

export async function fetchBoards(input: { limit: number; cursor?: string }) {
  const params = new URLSearchParams({ limit: String(input.limit) });
  if (input.cursor) params.set("cursor", input.cursor);

  return apiFetch<PaginatedResult<Board>>(`/api/boards?${params.toString()}`);
}

export async function fetchBoard(id: string) {
  return apiFetch<Board>(`/api/boards/${encodeURIComponent(id)}`);
}

export async function createBoardClient(input: {
  name: string;
  description?: string;
  isPublic?: boolean;
}) {
  return apiFetch<Board>("/api/boards", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBoardClient(input: {
  id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  order?: number;
}) {
  return apiFetch<Board>(`/api/boards/${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      isPublic: input.isPublic,
      order: input.order,
    }),
  });
}

export async function deleteBoardClient(id: string) {
  return apiFetch<{ success: boolean }>(`/api/boards/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function reorderBoardClient(input: { id: string; order: number }) {
  return apiFetch<Board>(`/api/boards/${encodeURIComponent(input.id)}/reorder`, {
    method: "POST",
    body: JSON.stringify({ order: input.order }),
  });
}

export async function fetchBoardGames(input: {
  boardId: string;
  limit: number;
  cursor?: string;
}) {
  const params = new URLSearchParams({
    limit: String(input.limit),
  });
  if (input.cursor) params.set("cursor", input.cursor);

  return apiFetch<PaginatedResult<BoardGameWithGame>>(
    `/api/boards/${encodeURIComponent(input.boardId)}/board-games?${params.toString()}`,
  );
}

export async function addBoardGameClient(input: {
  boardId: string;
  gameId: string;
  status?: GameStatus;
  platform?: string;
  rating?: number;
  notes?: string;
  order?: number;
}) {
  return apiFetch<BoardGame>(
    `/api/boards/${encodeURIComponent(input.boardId)}/board-games`,
    {
      method: "POST",
      body: JSON.stringify({
        gameId: input.gameId,
        status: input.status,
        platform: input.platform,
        rating: input.rating,
        notes: input.notes,
        order: input.order,
      }),
    },
  );
}

export async function updateBoardGameClient(input: {
  boardId: string;
  gameId: string;
  status?: GameStatus;
  rating?: number;
  notes?: string;
}) {
  return apiFetch<BoardGame>(
    `/api/boards/${encodeURIComponent(input.boardId)}/board-games/${encodeURIComponent(input.gameId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: input.status,
        rating: input.rating,
        notes: input.notes,
      }),
    },
  );
}

export async function deleteBoardGameClient(input: {
  boardId: string;
  gameId: string;
}) {
  return apiFetch<{ success: boolean }>(
    `/api/boards/${encodeURIComponent(input.boardId)}/board-games/${encodeURIComponent(input.gameId)}`,
    { method: "DELETE" },
  );
}

export async function reorderBoardGameClient(input: {
  boardId: string;
  gameId: string;
  order: number;
}) {
  return apiFetch<BoardGame>(
    `/api/boards/${encodeURIComponent(input.boardId)}/board-games/${encodeURIComponent(input.gameId)}/reorder`,
    {
      method: "POST",
      body: JSON.stringify({ order: input.order }),
    },
  );
}
