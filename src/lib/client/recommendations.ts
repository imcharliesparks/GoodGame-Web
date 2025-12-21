"use client";

import { apiFetch } from "./api";

export type RecommendationResponse = {
  results: Array<{
    gameId: string;
    title: string;
    reason: string;
    boards: Array<{ id: string; name: string; status?: string }>;
  }>;
  debug?: {
    candidateCount: number;
    boards: Array<{ id: string; name: string; itemCount: number }>;
    requestedBoardId?: string;
  };
};

export async function requestRecommendations(input: {
  query: string;
  signal?: AbortSignal;
  boardId?: string;
}) {
  return apiFetch<RecommendationResponse>("/api/ai/recommendations", {
    method: "POST",
    body: JSON.stringify({ query: input.query, boardId: input.boardId }),
    signal: input.signal,
  });
}
