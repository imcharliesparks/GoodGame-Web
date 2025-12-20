"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Check, Loader2, Search, ShieldOff, UserPlus, Users, X } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  acceptFriendRequestClient,
  addFriendClient,
  denyFriendRequestClient,
  fetchFriendRequests,
  fetchFriends,
  removeFriendClient,
  searchUsersClient,
  sendFriendRequestClient,
} from "@/lib/client/friends";
import type { FriendRequest } from "@/lib/types/friend-request";
import type { User } from "@/lib/types/user";

type RequestDirection = "incoming" | "outgoing";

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

export default function FriendsPage() {
  const [friendsState, setFriendsState] = useState<AsyncState<User[]>>({ status: "idle" });
  const [incomingState, setIncomingState] = useState<AsyncState<FriendRequest[]>>({
    status: "idle",
  });
  const [outgoingState, setOutgoingState] = useState<AsyncState<FriendRequest[]>>({
    status: "idle",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<AsyncState<User[]>>({ status: "idle" });
  const [requesting, setRequesting] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadFriends();
    void loadRequests("incoming");
    void loadRequests("outgoing");
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchQuery.trim().length < 2) {
        setSearchState({ status: "idle" });
        return;
      }
      void runSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const friends = friendsState.status === "success" ? friendsState.data : [];
  const incoming = incomingState.status === "success" ? incomingState.data : [];
  const outgoing = outgoingState.status === "success" ? outgoingState.data : [];

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const outgoingIds = useMemo(() => new Set(outgoing.map((r) => r.receiverId)), [outgoing]);
  const incomingIds = useMemo(() => new Set(incoming.map((r) => r.requesterId)), [incoming]);

  const runSearch = async (query: string) => {
    setSearchState({ status: "loading" });
    try {
      const { users } = await searchUsersClient({ query, limit: 10 });
      setSearchState({ status: "success", data: users });
    } catch (err) {
      setSearchState({
        status: "error",
        message: err instanceof Error ? err.message : "Search failed",
      });
    }
  };

  const loadFriends = async () => {
    setFriendsState({ status: "loading" });
    try {
      const { friends } = await fetchFriends();
      setFriendsState({ status: "success", data: friends });
    } catch (err) {
      setFriendsState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load friends",
      });
    }
  };

  const loadRequests = async (direction: RequestDirection) => {
    const setter = direction === "incoming" ? setIncomingState : setOutgoingState;
    setter({ status: "loading" });
    try {
      const { requests } = await fetchFriendRequests({ direction, limit: 20 });
      setter({ status: "success", data: requests });
    } catch (err) {
      setter({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load requests",
      });
    }
  };

  const handleSendRequest = async (userId: string) => {
    setRequesting((prev) => ({ ...prev, [userId]: true }));
    try {
      const { accepted, request } = await sendFriendRequestClient(userId);
      if (accepted) {
        await loadFriends();
        await loadRequests("incoming");
        await loadRequests("outgoing");
      } else {
        setOutgoingState((prev) => {
          if (prev.status !== "success") return prev;
          return { status: "success", data: [request, ...prev.data] };
        });
      }
    } catch (err) {
      // surface via search error
      setSearchState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to send request",
      });
    } finally {
      setRequesting((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequestClient(id);
      await loadFriends();
      await loadRequests("incoming");
    } catch (err) {
      setIncomingState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to accept request",
      });
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await denyFriendRequestClient(id);
      await loadRequests("incoming");
    } catch (err) {
      setIncomingState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to deny request",
      });
    }
  };

  const handleRemoveFriend = async (id: string) => {
    setRemoving((prev) => ({ ...prev, [id]: true }));
    try {
      await removeFriendClient(id);
      setFriendsState((prev) => {
        if (prev.status !== "success") return prev;
        return { status: "success", data: prev.data.filter((f) => f.id !== id) };
      });
    } catch (err) {
      setFriendsState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to remove friend",
      });
    } finally {
      setRemoving((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <AppShell
      title="Friends"
      description="Search users, send and manage friend requests, and view your friends."
    >
      <SignedOut>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          <p className="text-sm">Friends are protected. Sign in to search and manage friends.</p>
          <div className="mt-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">Find friends</h2>
                <div className="text-xs text-indigo-100/70">Search min 2 characters.</div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-indigo-200/70" />
                  <Input
                    placeholder="Search by username, name, or email"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full bg-white/5 pl-9 text-white placeholder:text-indigo-200/70"
                  />
                </div>
              </div>
              {searchState.status === "loading" ? (
                <div className="flex items-center gap-2 text-sm text-indigo-100/80">
                  <Loader2 className="size-4 animate-spin" />
                  Searching...
                </div>
              ) : null}
              {searchState.status === "error" ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {searchState.message}
                </div>
              ) : null}
              {searchState.status === "success" ? (
                searchState.data.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {searchState.data.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        isFriend={friendIds.has(user.id)}
                        hasIncoming={incomingIds.has(user.id)}
                        hasOutgoing={outgoingIds.has(user.id)}
                        onSendRequest={() => handleSendRequest(user.id)}
                        requesting={requesting[user.id]}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-indigo-100/70">No users found.</p>
                )
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <RequestPanel
              title="Incoming requests"
              state={incomingState}
              direction="incoming"
              onAccept={handleAccept}
              onDeny={handleDeny}
              onReload={() => loadRequests("incoming")}
            />
            <RequestPanel
              title="Outgoing requests"
              state={outgoingState}
              direction="outgoing"
              onReload={() => loadRequests("outgoing")}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Your friends</h2>
              <p className="text-sm text-indigo-100/70">Mutual friendships created via requests or direct add.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              onClick={() => {
                void loadFriends();
              }}
            >
              Refresh
            </Button>
          </div>
          {friendsState.status === "loading" ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-indigo-100/80">
              <Loader2 className="size-4 animate-spin" />
              Loading friends...
            </div>
          ) : null}
          {friendsState.status === "error" ? (
            <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {friendsState.message}
            </div>
          ) : null}
          {friends.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-white shadow-sm shadow-indigo-900/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                <p className="text-sm text-indigo-200/80">Friend</p>
                <p className="text-lg font-semibold">
                  {friend.username ? `@${friend.username}` : friend.name || friend.email}
                </p>
                <p className="text-xs text-indigo-100/70">
                  {friend.name ? `${friend.name} · ` : null}
                  {friend.email}
                </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-white"
                      onClick={() => handleRemoveFriend(friend.id)}
                      disabled={removing[friend.id]}
                      aria-label={`Remove ${friend.name ?? friend.email}`}
                    >
                      {removing[friend.id] ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-indigo-100/70">
                    <Link
                      href={`/friends/${friend.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                    >
                      View profile
                    </Link>
                    <span className="inline-flex items-center gap-1 text-emerald-200">
                      <Check className="size-3.5" />
                      Friends
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-indigo-100/70">No friends yet.</p>
          )}
        </div>
      </SignedIn>
    </AppShell>
  );
}

function UserCard({
  user,
  isFriend,
  hasIncoming,
  hasOutgoing,
  onSendRequest,
  requesting,
}: {
  user: User;
  isFriend: boolean;
  hasIncoming: boolean;
  hasOutgoing: boolean;
  onSendRequest: () => void;
  requesting?: boolean;
}) {
  let cta: React.ReactNode;
  if (isFriend) {
    cta = (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
        <Check className="size-3.5" />
        Friends
      </span>
    );
  } else if (hasOutgoing) {
    cta = (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100/80">
        <Loader2 className="size-3.5 animate-spin text-indigo-200" />
        Request sent
      </span>
    );
  } else if (hasIncoming) {
    cta = (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
        <ShieldOff className="size-3.5" />
        Incoming
      </span>
    );
  } else {
    cta = (
      <Button
        type="button"
        size="sm"
        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:brightness-105"
        onClick={onSendRequest}
        disabled={requesting}
      >
        {requesting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
        Add friend
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-white shadow-sm shadow-indigo-900/20">
      <div>
        <p className="text-sm font-semibold">
          {user.username ? `@${user.username}` : user.name || user.email}
        </p>
        <p className="text-xs text-indigo-100/70">
          {user.name ? `${user.name} · ` : null}
          {user.email}
        </p>
      </div>
      <div className="flex items-center justify-between text-sm">
        <Link
          href={`/friends/${user.id}`}
          className="text-indigo-100 underline decoration-indigo-400/60 underline-offset-4 hover:text-white"
        >
          View profile
        </Link>
        {cta}
      </div>
    </div>
  );
}

function RequestPanel({
  title,
  state,
  direction,
  onAccept,
  onDeny,
  onReload,
}: {
  title: string;
  state: AsyncState<FriendRequest[]>;
  direction: RequestDirection;
  onAccept?: (id: string) => void;
  onDeny?: (id: string) => void;
  onReload: () => void;
}) {
  const isIncoming = direction === "incoming";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-indigo-900/20">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Users className="size-4" />
          {title}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-indigo-100 hover:text-white"
          onClick={onReload}
        >
          Refresh
        </Button>
      </div>
      {state.status === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-indigo-100/80">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {state.message}
        </div>
      ) : null}
      {state.status === "success" && state.data.length === 0 ? (
        <p className="text-xs text-indigo-100/70">No {direction} requests.</p>
      ) : null}
      {state.status === "success" && state.data.length > 0 ? (
        <div className="space-y-2">
          {state.data.map((req) => {
            const counterpart = isIncoming ? req.requester : req.receiver;
            return (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {counterpart?.name || counterpart?.email || "Unknown user"}
                  </span>
                  {counterpart?.email ? (
                    <span className="text-xs text-indigo-100/70">{counterpart.email}</span>
                  ) : null}
                </div>
                {isIncoming ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                      onClick={() => onAccept?.(req.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onDeny?.(req.id)}
                    >
                      Deny
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-indigo-100/70">Pending</span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
