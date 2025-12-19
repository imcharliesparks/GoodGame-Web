"use client";

import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { Loader2, RefreshCcw } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { isLoaded, user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!user) return;
    setError(null);
    setIsRefreshing(true);
    try {
      await user.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh user.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const email = user?.primaryEmailAddress?.emailAddress ?? "-";
  const name = user?.fullName ?? user?.username ?? "-";
  const created = user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-";

  return (
    <AppShell
      title="Profile"
      description="Shows your Clerk user directly via useUser(); no backend call required."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={handleRefresh}
          disabled={!user || isRefreshing}
        >
          {isRefreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
          Refresh
        </Button>
      }
    >
      <SignedOut>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          <p className="text-sm">Sign in to load your user document.</p>
          <div className="mt-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {!isLoaded ? (
            <div className="flex items-center gap-2 text-sm text-indigo-100/80">
              <Loader2 className="size-4 animate-spin" />
              Loading user...
            </div>
          ) : null}

          {isLoaded && user ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-indigo-200">Clerk user</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileField label="ID" value={user.id} />
                <ProfileField label="Email" value={email} />
                <ProfileField label="Name" value={name} />
                <ProfileField label="Created" value={created} />
              </div>
              {user.imageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.imageUrl}
                    alt="Avatar"
                    className="size-12 rounded-full border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm text-indigo-100/80">Avatar from Clerk</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SignedIn>
    </AppShell>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-wide text-indigo-200">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
