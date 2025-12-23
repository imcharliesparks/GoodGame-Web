"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { fetchBoardGames, fetchUserPublicBoards } from "@/lib/client/boards";
import { fetchUserProfile } from "@/lib/client/friends";
import type { Board } from "@/lib/types/board";
import type { User } from "@/lib/types/user";

import { Avatar, PublicBoardCard } from "../page";

export default function PublicProfilePage() {
  const params = useParams<{ id?: string | string[] }>();
  const profileId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw ?? "";
  }, [params]);

  const { isSignedIn } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardGameCounts, setBoardGameCounts] = useState<Record<string, number>>({});
  const [libraryCount, setLibraryCount] = useState<number | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boardsFetchToken = useRef(0);

  useEffect(() => {
    const load = async () => {
      if (!profileId || !isSignedIn) return;
      setStatus("loading");
      setError(null);
      try {
        const { user } = await fetchUserProfile(profileId);
        setProfile(user);
        setStatus("idle");
        await loadBoards(profileId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setStatus("error");
      }
    };
    void load();
  }, [profileId, isSignedIn]);

  const loadBoards = async (userId: string) => {
    const token = ++boardsFetchToken.current;
    setBoardsLoading(true);
    setLibraryCount(null);
    try {
      const collected: Board[] = [];
      let cursor: string | undefined;

      do {
        const page = await fetchUserPublicBoards({ userId, limit: 50, cursor });
        if (boardsFetchToken.current !== token) return;
        collected.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      if (boardsFetchToken.current !== token) return;
      setBoards(collected);

      const createLimiter = (maxConcurrent: number) => {
        const queue: Array<() => void> = [];
        let active = 0;

        const runNext = () => {
          if (active >= maxConcurrent) return;
          const nextTask = queue.shift();
          if (!nextTask) return;
          active++;
          nextTask();
        };

        return function <T>(fn: () => Promise<T>): Promise<T> {
          return new Promise<T>((resolve, reject) => {
            const run = () => {
              fn()
                .then(resolve)
                .catch(reject)
                .finally(() => {
                  active--;
                  runNext();
                });
            };

            if (active < maxConcurrent) {
              active++;
              run();
            } else {
              queue.push(run);
            }
          });
        };
      };

      const limiter = createLimiter(5);
      const boardCountResults = await Promise.all(
        collected.map((board) =>
          limiter(async () => {
            let boardCursor: string | undefined;
            let boardCount = 0;
            do {
              if (boardsFetchToken.current !== token) return null;
              const page = await fetchBoardGames({ boardId: board.id, limit: 50, cursor: boardCursor });
              if (boardsFetchToken.current !== token) return null;
              boardCount += page.items.length;
              boardCursor = page.nextCursor ?? undefined;
            } while (boardCursor);

            const normalizedName = board.name.trim().toLowerCase();
            return {
              boardId: board.id,
              count: boardCount,
              isLibrary: normalizedName === "library",
            };
          }),
        ),
      );

      if (boardsFetchToken.current !== token) return;

      const counts: Record<string, number> = {};
      let libraryCountLocal: number | null = null;

      for (const result of boardCountResults) {
        if (!result) continue;
        counts[result.boardId] = result.count;
        if (result.isLibrary) {
          libraryCountLocal = result.count;
        }
      }

      setBoardGameCounts(counts);
      setLibraryCount(libraryCountLocal);
    } catch (err) {
      if (boardsFetchToken.current !== token) return;
      setError(err instanceof Error ? err.message : "Failed to load public boards");
    } finally {
      if (boardsFetchToken.current === token) {
        setBoardsLoading(false);
      }
    }
  };

  const publicBoards = boards.filter((board) => board.isPublic);
  const created = profile?.createdAt ? formatDate(profile.createdAt) : "-";
  const location =
    typeof profile?.publicMetadata?.location === "string" &&
    profile.publicMetadata.location.trim().length
      ? profile.publicMetadata.location
      : null;

  const stats: Array<{ label: string; value: string }> = [];
  if (profile?.createdAt) {
    stats.push({ label: "Date joined", value: created });
  }
  if (location) {
    stats.push({ label: "Location", value: location });
  }
  if (libraryCount !== null) {
    stats.push({ label: "Games in library", value: libraryCount.toLocaleString() });
  }
  if (publicBoards.length) {
    stats.push({ label: "Public boards", value: publicBoards.length.toString() });
  }

  return (
    <AppShell
      title={profile?.username ? `@${profile.username}` : profile?.name || profile?.email || "Profile"}
      description="View a user's public profile and public boards."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/25 text-white"
          onClick={() => loadBoards(profileId)}
          disabled={!isSignedIn || !profileId}
        >
          Refresh
        </Button>
      }
    >
      <SignedOut>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          <p className="text-sm">Sign in to view user profiles.</p>
          <div className="mt-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="space-y-6">
          {status === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-indigo-100/80">
              <Loader2 className="size-4 animate-spin" />
              Loading profile...
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {profile ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <Avatar imageUrl={profile.avatarUrl ?? null} fallback={profile.name ?? profile.username ?? profile.email} />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-indigo-200">Profile</p>
                    <h1 className="text-2xl font-semibold text-white">
                      {profile.name || profile.username || profile.email || "User"}
                    </h1>
                    <p className="text-sm text-indigo-100/70">
                      {profile.username ? `@${profile.username}` : null}
                      {profile.username && profile.email ? " | " : null}
                      {profile.email}
                    </p>
                  </div>
                  {stats.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-indigo-100/80"
                        >
                          <p className="text-xs uppercase tracking-wide text-indigo-200">{stat.label}</p>
                          <p className="text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Public boards</h2>
                <p className="text-sm text-indigo-100/70">Public boards for this user.</p>
              </div>
              {boardsLoading ? <Loader2 className="size-4 animate-spin text-indigo-200" aria-hidden /> : null}
            </div>

            {publicBoards.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {publicBoards.map((board) => (
                  <PublicBoardCard key={board.id} board={board} gameCount={boardGameCounts[board.id]} />
                ))}
              </div>
            ) : !boardsLoading ? (
              <p className="mt-4 text-sm text-indigo-100/70">No public boards yet.</p>
            ) : null}
          </section>
        </div>
      </SignedIn>
    </AppShell>
  );
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
