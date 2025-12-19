"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2, RefreshCcw } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { fetchCurrentUser } from "@/lib/client/user";
import type { User } from "@/lib/types/user";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCurrentUser();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user.");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="Profile"
      description="Fetches /api/user/me to show the Argus user linked to your Clerk account."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={load}
          disabled={isLoading}
        >
          <RefreshCcw className="mr-2 size-4" />
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

          {isLoading && !user ? (
            <div className="flex items-center gap-2 text-sm text-indigo-100/80">
              <Loader2 className="size-4 animate-spin" />
              Loading user...
            </div>
          ) : null}

          {user ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-indigo-200">Clerk user</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileField label="ID" value={user.id} />
                <ProfileField label="Email" value={user.email} />
                <ProfileField label="Name" value={user.name ?? "—"} />
                <ProfileField
                  label="Created"
                  value={new Date(user.createdAt).toLocaleString()}
                />
              </div>
              {user.avatarUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatarUrl}
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
