// The signed-in app frame: a frosted-glass header with the five places a
// student goes (Today, Study, Act, Island, Class) and their live coins and streak.
import { motion } from "framer-motion";
import { BookOpen, CalendarCheck, Flame, HandHeart, LogOut, Palmtree, Settings as SettingsIcon, TriangleAlert, Users } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Counter from "@/components/bits/Counter";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useHotkey, useToday } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { effectiveStreak } from "@/shared/dates";
import { CommandPalette } from "./CommandPalette";
import { Logo, Treecoin } from "./Logo";

const NAV = [
  { to: "/today", label: "Today", icon: CalendarCheck },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/act", label: "Act", icon: HandHeart },
  { to: "/island", label: "Island", icon: Palmtree },
  { to: "/class", label: "Class", icon: Users },
];

function NavTabs({ teacher }: { teacher: boolean }) {
  const { pathname } = useLocation();
  const active =
    NAV.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`))?.to ?? (pathname.startsWith("/practice") ? "/study" : pathname.startsWith("/ambassador") ? "/act" : "");
  return (
    <nav aria-label="Main" className="flex items-center gap-1 rounded-lg bg-surface-2/80 p-1">
      {NAV.map((n) => {
        const on = active === n.to;
        const label = n.to === "/class" && teacher ? "Classes" : n.label;
        return (
          <NavLink
            key={n.to}
            to={n.to}
            className={cn("relative z-0 inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-base font-semibold transition-colors", on ? "text-fg" : "text-fg-3 hover:text-fg-2")}
            aria-current={on ? "page" : undefined}
          >
            {on && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 -z-10 rounded-md bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <n.icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Stat({ children, label, to }: { children: ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-base font-semibold text-fg transition-colors hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, authUser, signOut, error, retry } = useSession();
  const navigate = useNavigate();
  const today = useToday();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setPaletteOpen((o) => !o);
  }, []);
  useHotkey("k", openPalette, { meta: true });

  const teacher = profile?.role === "teacher";
  const streak = effectiveStreak(profile?.streak, profile?.last_set_day, today);
  const coins = profile?.treecoins ?? 0;
  const name = profile?.username || profile?.full_name || authUser?.displayName || "Student";

  return (
    <div className="bg-scene min-h-dvh">
      <header className="glass sticky top-0 z-40 border-b print:hidden">
        <div className="mx-auto grid h-16 max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-8">
          <Link to="/today" className="justify-self-start rounded-md" aria-label="Ecoisland home">
            <Logo />
          </Link>
          <NavTabs teacher={teacher} />
          <div className="flex items-center justify-self-end gap-1">
            {!teacher && (
              <Stat label={`${streak}-day streak`} to="/today">
                <Flame className={cn("size-[18px]", streak > 0 ? "fill-sun/30 text-sun" : "text-fg-4")} aria-hidden />
                <span className="t-num">{streak}</span>
              </Stat>
            )}
            <Stat label={`${coins} Treecoins`} to="/island">
              <Treecoin size={18} />
              <Counter value={coins} fontSize={14} fontWeight={600} tabular />
            </Stat>
            <Menu>
              <MenuTrigger className="ml-1 rounded-full" aria-label="Account menu">
                <Avatar name={name} src={profile?.avatar_url} size={32} />
              </MenuTrigger>
              <MenuContent>
                <MenuLabel>
                  <span className="block text-base font-semibold text-fg">{name}</span>
                  <span className="block">{teacher ? "Teacher account" : "Student account"}</span>
                </MenuLabel>
                <MenuSeparator />
                <MenuItem onSelect={() => navigate("/settings")}>
                  <SettingsIcon /> Settings
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  onSelect={async () => {
                    await signOut();
                    navigate("/");
                  }}
                >
                  <LogOut /> Sign out
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
        {error && (
          <div className="border-t border-line bg-sun-soft">
            <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-8 py-2 text-base text-sun-ink">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{error}</span>
              <button onClick={retry} className="font-semibold underline underline-offset-2">
                Try again
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-[1240px] px-8 pt-8 pb-24 print:max-w-none print:p-0">{children}</main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} teacher={teacher} />
    </div>
  );
}
