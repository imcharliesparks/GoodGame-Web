import Link from "next/link";
import { ArrowRight, Gamepad2, HeartPulse, ListChecks, Search, User } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

const cards = [
  {
    title: "Health",
    href: "/health",
    description: "Check the Argus backend heartbeat via /api/health.",
    icon: HeartPulse,
  },
  {
    title: "Games",
    href: "/games",
    description: "Browse cached games with cursor pagination.",
    icon: Gamepad2,
  },
  {
    title: "Search",
    href: "/games/search",
    description: "Debounced search over cached games through the proxy route.",
    icon: Search,
  },
  {
    title: "Boards",
    href: "/boards",
    description: "Manage boards and board games (requires Clerk auth).",
    icon: ListChecks,
  },
  {
    title: "Profile",
    href: "/profile",
    description: "View your Clerk-linked Argus user record.",
    icon: User,
  },
];

export default function Home() {
  return (
    <AppShell
      title="GoodGame control panel"
      description="Navigate the Argus-backed endpoints through focused UI pages. Everything here is wired to the REST routes defined in docs/rest_endpoints.md."
      actions={
        <Button
          asChild
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
        >
          <Link href="/games/search">
            Open search <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-indigo-900/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-indigo-900/20 opacity-0 transition group-hover:opacity-100" />
            <div className="relative flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600/80 text-white shadow-lg shadow-indigo-900/40">
                <card.icon className="size-5" />
              </div>
              <h2 className="text-lg font-semibold">{card.title}</h2>
            </div>
            <p className="relative mt-3 text-sm text-indigo-100/80">{card.description}</p>
            <div className="relative mt-4 flex items-center gap-2 text-sm font-medium text-indigo-100 transition group-hover:text-white">
              <span>Open</span>
              <ArrowRight className="size-4" />
            </div>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
