import { argusRequestJson } from "@/lib/argus/http";
import type { FriendRequest } from "@/lib/types/friend-request";
import type { User } from "@/lib/types/user";

export type ArgusCallOptions = {
  token?: string;
};

export type UserSearchInput = {
  query: string;
  limit: number;
};

export async function searchUsers(
  input: UserSearchInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ users: User[] }>({
    path: "/api/users/search",
    token: options.token,
    query: {
      q: input.query,
      limit: input.limit,
    },
  });
}

export async function getUserById(
  id: string,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ user: User }>({
    path: `/api/users/${encodeURIComponent(id)}`,
    token: options.token,
  });
}

export async function listFriends(options: ArgusCallOptions = {}) {
  return argusRequestJson<{ friends: User[] }>({
    path: "/api/friends",
    token: options.token,
  });
}

export async function addFriend(
  friendId: string,
  options: ArgusCallOptions = {},
) {
  /**
   * Immediately creates a mutual friendship (no pending state) between the caller and friendId.
   * Returns the confirmed friend record `{ friend: User }`; caller must be authorized and not self-friending.
   */
  return argusRequestJson<{ friend: User }>({
    path: "/api/friends",
    method: "POST",
    token: options.token,
    body: { friendId },
  });
}

export async function removeFriend(
  friendId: string,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ success: boolean }>({
    path: `/api/friends/${encodeURIComponent(friendId)}`,
    method: "DELETE",
    token: options.token,
  });
}

export type FriendRequestDirection = "incoming" | "outgoing";

export type ListFriendRequestsInput = {
  direction?: FriendRequestDirection;
  limit: number;
};

export async function listFriendRequests(
  input: ListFriendRequestsInput,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ requests: FriendRequest[] }>({
    path: "/api/friend-requests",
    token: options.token,
    query: {
      direction: input.direction,
      limit: input.limit,
    },
  });
}

export async function sendFriendRequest(
  friendId: string,
  options: ArgusCallOptions = {},
) {
  /**
   * Starts the friend-request workflow; may auto-accept if a reciprocal pending request exists.
   * Returns `{ request: FriendRequest; accepted: boolean }` where `accepted` signals mutual auto-accept; caller must be authorized.
   */
  return argusRequestJson<{ request: FriendRequest; accepted: boolean }>({
    path: "/api/friend-requests",
    method: "POST",
    token: options.token,
    body: { friendId },
  });
}

export async function acceptFriendRequest(
  id: string,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ request: FriendRequest }>({
    path: `/api/friend-requests/${encodeURIComponent(id)}/accept`,
    method: "POST",
    token: options.token,
  });
}

export async function denyFriendRequest(
  id: string,
  options: ArgusCallOptions = {},
) {
  return argusRequestJson<{ request: FriendRequest }>({
    path: `/api/friend-requests/${encodeURIComponent(id)}/deny`,
    method: "POST",
    token: options.token,
  });
}
