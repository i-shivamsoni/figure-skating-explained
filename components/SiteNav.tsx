"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/lib/uiStore";
import { ThemeToggle } from "./ThemeToggle";
import { IconButton } from "./ui/IconButton";
import { cn } from "./ui/cn";

export interface NavItem {
  href: string;
  label: string;
  hint?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}
export type NavEntry = NavItem | NavGroup;

/** Rink first, then the lessons; Sources lives in the footer and the phone sheet. */
export const NAV: NavEntry[] = [
  { href: "/rink", label: "Rink", hint: "Steer the skater, perform elements, watch the score add up" },
  {
    label: "Elements",
    items: [
      { href: "/jumps", label: "Jumps", hint: "Six jumps, one to five rotations" },
      { href: "/spins", label: "Spins", hint: "Positions, variations, levels" },
      { href: "/steps", label: "Steps", hint: "Turns, steps and the step sequence" },
      { href: "/choreo", label: "Choreo", hint: "Choreographic sequence and spin" },
      { href: "/pairs", label: "Pairs", hint: "Lifts, twists, throws, death spirals" },
      { href: "/compare", label: "Compare", hint: "Two elements on one clock" },
    ],
  },
  {
    label: "Scoring",
    items: [
      { href: "/scoring", label: "How scoring works", hint: "Base value, GOE, components" },
      { href: "/calculator", label: "Calculator", hint: "Build and score a program" },
      { href: "/decoder", label: "Decoder", hint: "Read a protocol code" },
    ],
  },
];

const isGroup = (e: NavEntry): e is NavGroup => "items" in e;
const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

export function SiteNav() {
  const pathname = usePathname();
  // the sheet remembers the path it was opened on, so navigating closes it without an effect
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menu = menuPath === pathname;
  const setMenu = (open: boolean) => setMenuPath(open ? pathname : null);
  const openSkater = useUiStore((s) => s.openSkaterDrawer);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="focus-ring mr-2 flex shrink-0 items-center gap-2 rounded-md font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-6 w-6 rounded-full bg-accent" />
          <span className="hidden sm:inline">Figure Skating Explained</span>
          <span className="sm:hidden">Skating Explained</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((e) => (isGroup(e) ? <GroupMenu key={e.label} group={e} pathname={pathname} /> : <TopLink key={e.href} item={e} active={isActive(pathname, e.href)} />))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={openSkater} className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2 sm:inline-flex">
            <UserRound className="h-4 w-4" />
            Your skater
          </button>
          <IconButton label="Your skater" onClick={openSkater} className="sm:hidden">
            <UserRound className="h-5 w-5" />
          </IconButton>
          <ThemeToggle />
          <IconButton label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu(!menu)} className="md:hidden" aria-expanded={menu} aria-controls="mobile-nav">
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </IconButton>
        </div>
      </div>
      {menu && (
        <nav id="mobile-nav" aria-label="Primary" className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-border bg-surface px-4 py-3 md:hidden">
          {NAV.map((e) =>
            isGroup(e) ? (
              <div key={e.label} className="py-2">
                <p className="px-2 text-xs font-semibold tracking-widest text-muted uppercase">{e.label}</p>
                <ul className="mt-1">
                  {e.items.map((i) => (
                    <li key={i.href}>
                      <SheetLink item={i} active={isActive(pathname, i.href)} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SheetLink key={e.href} item={e} active={isActive(pathname, e.href)} />
            ),
          )}
          <Link href="/sources" className="mt-2 block rounded-md px-2 py-2 text-sm text-muted hover:bg-surface-2">
            Sources
          </Link>
        </nav>
      )}
    </header>
  );
}

function TopLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("focus-ring rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2", active ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:text-foreground")}>
      {item.label}
    </Link>
  );
}

function SheetLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("block rounded-md px-2 py-2 text-base", active ? "bg-accent-soft font-medium text-accent-strong" : "hover:bg-surface-2")}>
      {item.label}
      {item.hint && <span className="block text-xs font-normal text-muted">{item.hint}</span>}
    </Link>
  );
}

function GroupMenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (o: boolean) => setOpenPath(o ? pathname : null);
  const ref = useRef<HTMLDivElement>(null);
  const active = group.items.some((i) => isActive(pathname, i.href));
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setOpen is a stable wrapper over setOpenPath
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className={cn("focus-ring inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2", active ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:text-foreground")}
      >
        {group.label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {group.items.map((i) => (
            <Link key={i.href} role="menuitem" href={i.href} onClick={() => setOpen(false)} className={cn("focus-ring block rounded-lg px-3 py-2 hover:bg-surface-2", isActive(pathname, i.href) && "bg-accent-soft text-accent-strong")}>
              <span className="font-medium">{i.label}</span>
              {i.hint && <span className="block text-xs text-muted">{i.hint}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
