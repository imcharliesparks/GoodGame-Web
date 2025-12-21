"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type MobileNavProps = {
  links: NavLink[];
  activeHref: string | null;
};

export function MobileNav({ links, activeHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] border-white/10 bg-slate-950 text-white">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 pt-6  mt-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-base transition",
                link.href === activeHref
                  ? "bg-indigo-500/10 text-white ring-1 ring-inset ring-indigo-500/40"
                  : "text-indigo-100 hover:bg-white/5 hover:text-white",
              )}
            >
              <link.icon className="size-4" />
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-4">
            <SignedIn>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-sm text-indigo-100">Account</span>
                <UserButton />
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button className="mt-1 w-full bg-indigo-600 text-white hover:bg-indigo-500">Sign in</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
