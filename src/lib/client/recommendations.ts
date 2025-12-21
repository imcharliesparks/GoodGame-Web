"use client";

import { apiFetch } from "./api";

export type RecommendationResponse = {
  results: Array<{
    gameId: string;
    title: string;
    reason: string;
  }>;
};

export async function requestRecommendations(input: {
  query: string;
  signal?: AbortSignal;
}) {
  return apiFetch<RecommendationResponse>("/api/ai/recommendations", {
    method: "POST",
    body: JSON.stringify({ query: input.query }),
    signal: input.signal,
  });
}
