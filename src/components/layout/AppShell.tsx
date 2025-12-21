"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Gamepad2, HeartPulse, Home, ListChecks, Search, Sparkles, User2, Users } from "lucide-react";

import { MobileNav, type NavLink } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/games/search", label: "Search", icon: Search },
  { href: "/ai/recommendations", label: "Curator", icon: Sparkles },
  { href: "/boards", label: "Boards", icon: ListChecks },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User2 },
];

type AppShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ title, description, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const activeHref = links.reduce<string | null>((acc, link) => {
    const matches =
      link.href === "/"
        ? pathname === "/"
        : pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (!matches) return acc;
    if (!acc) return link.href;
    return link.href.length > acc.length ? link.href : acc;
  }, null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-100 hover:text-white">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600/80 text-white shadow-lg shadow-indigo-900/30">
              <Gamepad2 className="size-5" />
            </div>
            <span>GoodGame</span>
          </Link>
          <div className="flex items-center gap-2">
            <MobileNav links={links} activeHref={activeHref} />
            <nav className="hidden items-center gap-1 rounded-full bg-white/5 p-1 text-sm backdrop-blur md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-indigo-100 transition",
                    link.href === activeHref
                      ? "bg-indigo-500/20 text-white shadow-sm shadow-indigo-800/50"
                      : "hover:bg-white/10 hover:text-white",
                  )}
                >
                  <link.icon className="size-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
                  >
                    Sign in
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-950/30">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                API-powered views
              </p>
              <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
              {description ? (
                <p className="max-w-3xl text-base text-indigo-100/80">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
