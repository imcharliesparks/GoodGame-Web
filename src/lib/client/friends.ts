"use client";

import { apiFetch } from "./api";
import type { FriendRequest } from "@/lib/types/friend-request";
import type { User } from "@/lib/types/user";

const DEFAULT_LIMIT = 20;

export async function searchUsersClient(input: { query: string; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), 50);
  const params = new URLSearchParams({
    q: input.query,
    limit: String(limit),
  });
  return apiFetch<{ users: User[] }>(`/api/users/search?${params.toString()}`);
}

export async function fetchUserProfile(id: string) {
  return apiFetch<{ user: User }>(`/api/users/${encodeURIComponent(id)}`);
}

export async function fetchFriends() {
  return apiFetch<{ friends: User[] }>("/api/friends");
}

export async function addFriendClient(friendId: string) {
  return apiFetch<{ friend: User }>("/api/friends", {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
}

export async function removeFriendClient(friendId: string) {
  return apiFetch<{ success: boolean }>(`/api/friends/${encodeURIComponent(friendId)}`, {
    method: "DELETE",
  });
}

export async function fetchFriendRequests(input: {
  direction?: "incoming" | "outgoing";
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), 50);
  const params = new URLSearchParams({
    direction: input.direction ?? "incoming",
    limit: String(limit),
  });
  return apiFetch<{ requests: FriendRequest[] }>(
    `/api/friend-requests?${params.toString()}`,
  );
}

export async function sendFriendRequestClient(friendId: string) {
  return apiFetch<{ request: FriendRequest; accepted: boolean }>("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
}

export async function acceptFriendRequestClient(id: string) {
  return apiFetch<{ request: FriendRequest }>(
    `/api/friend-requests/${encodeURIComponent(id)}/accept`,
    { method: "POST" },
  );
}

export async function denyFriendRequestClient(id: string) {
  return apiFetch<{ request: FriendRequest }>(
    `/api/friend-requests/${encodeURIComponent(id)}/deny`,
    { method: "POST" },
  );
}
