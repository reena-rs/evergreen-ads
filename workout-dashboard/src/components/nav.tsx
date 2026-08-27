"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "Daily Feed" },
  { href: "/workouts", label: "Workouts" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-semibold tracking-tight text-neutral-100">
          Reena&apos;s Workout Plan
        </span>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-emerald-950 text-emerald-300"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-200"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
