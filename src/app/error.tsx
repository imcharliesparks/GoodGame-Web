"use client";

import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <AppShell
      title="Something went wrong"
      description="An unexpected error occurred. Try again or head back while we investigate."
      actions={
        <div className="flex gap-2">
          <Button onClick={reset} className="flex items-center gap-2">
            <RotateCw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="outline" className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white">
            <Link href="/">
              Back home
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-6 shadow-lg shadow-indigo-950/30">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/30 text-amber-100">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-50">Unexpected error</p>
            <p className="text-sm text-indigo-100/80">
              The action failed. If this keeps happening, reach out with the steps you took.
            </p>
          </div>
        </div>
        {error?.digest ? (
          <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-indigo-100/70">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
