"use client";

import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <AppShell
      title="Page not found"
      description="We couldn't find the page you're looking for. Check the URL or head back to the app."
      actions={
        <Button asChild variant="outline" className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" />
            Back home
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-black/30 p-6 shadow-lg shadow-indigo-950/30 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-600/30 text-white">
            <Compass className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-indigo-100">404 — Missing route</p>
            <p className="text-sm text-indigo-100/80">
              If you followed a link here, it might be out of date or the resource was removed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/games">Browse games</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/boards">View your boards</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
