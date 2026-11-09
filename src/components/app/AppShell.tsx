// The signed-in app frame: a left sidebar for the places a student goes, and
// a slim top bar with search, their live streak and coins, and the account
// menu. The sidebar can be resized and hidden (see src/lib/sidebar.tsx).
import { Flame, LogOut, PanelLeftOpen, Search, Settings as SettingsIcon, TriangleAlert } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import Counter from "@/components/bits/Counter";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useHotkey, useToday } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { SidebarProvider, useSidebar } from "@/lib/sidebar";
import { cn, modKey } from "@/lib/utils";
import { effectiveStreak } from "@/shared/dates";
import { CommandPalette } from "./CommandPalette";
import { Logo, Treecoin } from "./Logo";
import { Sidebar } from "./Sidebar";

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

function Frame({ children }: { children: ReactNode }) {
  const { profile, authUser, signOut, error, retry } = useSession();
  const { hidden, show, toggle } = useSidebar();
  const navigate = useNavigate();
  const today = useToday();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    setPaletteOpen((o) => !o);
  }, []);
  const toggleSidebar = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      toggle();
    },
    [toggle],
  );
  useHotkey("k", openPalette, { meta: true });
  useHotkey("b", toggleSidebar, { meta: true });

  const teacher = profile?.role === "teacher";
  const streak = effectiveStreak(profile?.streak, profile?.last_set_day, today);
  const coins = profile?.treecoins ?? 0;
  const name = profile?.username || profile?.full_name || authUser?.displayName || "Student";

  return (
    <div className="bg-scene flex min-h-dvh print:block">
      <Sidebar teacher={teacher} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 border-b print:hidden">
          <div className="flex h-16 items-center gap-3 px-8">
            {hidden && (
              <>
                <Button id="show-sidebar" variant="ghost" size="icon" onClick={show} aria-label="Show sidebar" aria-controls="app-sidebar" title={`Show sidebar (${modKey()}B)`}>
                  <PanelLeftOpen />
                </Button>
                <Link to="/today" className="rounded-md" aria-label="Ecoisland home">
                  <Logo />
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={`Search and jump to a page (${modKey()}K)`}
              className="inline-flex h-9 w-[240px] items-center gap-2 rounded-md border border-line bg-surface/70 px-3 text-base text-fg-3 transition-colors hover:bg-surface"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-left">Search</span>
              <kbd className="kbd">{modKey()}K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
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
              <div className="flex items-center gap-3 px-8 py-2 text-base text-sun-ink">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{error}</span>
                <button onClick={retry} className="font-semibold underline underline-offset-2">
                  Try again
                </button>
              </div>
            </div>
          )}
        </header>
        <main className="mx-auto w-full max-w-[1240px] px-8 pt-8 pb-24 print:max-w-none print:p-0">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} teacher={teacher} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Frame>{children}</Frame>
    </SidebarProvider>
  );
}
