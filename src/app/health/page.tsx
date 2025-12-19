"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHealthStatus } from "@/lib/client/health";
import type { HealthStatus } from "@/lib/types/health";

export default function HealthPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHealthStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AppShell
      title="Health status"
      description="Directly calls /api/health (proxying the Argus backend) to validate connectivity and uptime."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {!status && !error ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : null}

        {status ? (
          <div className="flex flex-col gap-2 text-sm text-indigo-50">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                {status.status}
              </span>
              <p className="text-indigo-100/80">Backend responded successfully.</p>
            </div>
            <p className="text-indigo-100/70">Timestamp: {new Date(status.timestamp).toLocaleString()}</p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
