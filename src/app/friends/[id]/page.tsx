"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowLeft, Check, Loader2, UserMinus, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  fetchFriends,
  fetchUserProfile,
  removeFriendClient,
  sendFriendRequestClient,
} from "@/lib/client/friends";
import type { User } from "@/lib/types/user";

export default function FriendProfilePage() {
  const params = useParams<{ id?: string | string[] }>();
  const userId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw ?? "";
  }, [params]);

  const [profile, setProfile] = useState<User | null>(null);
  const [friends, setFriends] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setStatus("loading");
      setError(null);
      try {
        const [profileRes, friendsRes] = await Promise.all([
          fetchUserProfile(userId),
          fetchFriends(),
        ]);
        setProfile(profileRes.user);
        setFriends(friendsRes.friends.map((f) => f.id));
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setStatus("error");
      }
    };
    void load();
  }, [userId]);

  const isFriend = profile ? friends.includes(profile.id) : false;

  const handleAddFriend = async () => {
    if (!profile) return;
    setActionBusy(true);
    try {
      await sendFriendRequestClient(profile.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!profile) return;
    setActionBusy(true);
    try {
      await removeFriendClient(profile.id);
      setFriends((prev) => prev.filter((id) => id !== profile.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove friend");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <AppShell
      title={profile?.username ? `@${profile.username}` : profile?.name || profile?.email || "Friend profile"}
      description="View user details and manage friendship."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/25 text-white hover:bg-white/10"
          asChild
        >
          <Link href="/friends">
            <ArrowLeft className="mr-2 size-4" />
            Back to friends
          </Link>
        </Button>
      }
    >
      <SignedOut>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          <p className="text-sm">Sign in to view friend profiles.</p>
          <div className="mt-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-lg shadow-indigo-950/30">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">User</p>
                <h1 className="text-2xl font-semibold">
                  {profile.username ? `@${profile.username}` : profile.name || profile.email}
                </h1>
                <p className="text-sm text-indigo-100/70">
                  {profile.name ? `${profile.name} · ` : null}
                  {profile.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isFriend ? (
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                      <Check className="size-3.5" />
                      Friends
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleRemove}
                      disabled={actionBusy}
                    >
                      {actionBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserMinus className="mr-2 size-4" />}
                      Remove friend
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:brightness-105"
                    onClick={handleAddFriend}
                    disabled={actionBusy}
                  >
                    {actionBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
                    Send friend request
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SignedIn>
    </AppShell>
  );
}
