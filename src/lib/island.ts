// The island's health, read from one place. Today, the Island page and the
// practice results all show it, so they all use this: the student's last
// completed daily set and today's date, through islandHealth().
import { islandHealth, type Health } from "@/shared/economy";
import type { DayKey } from "@/shared/dates";
import { useToday } from "./hooks";
import { useProfile } from "./session";

/**
 * `lastSetDay` overrides the saved day, for the moment right after a daily set
 * is finished and the profile hasn't caught up yet.
 */
export function useIslandHealth(lastSetDay?: DayKey): Health {
  const profile = useProfile();
  const today = useToday();
  return islandHealth(lastSetDay ?? profile.last_set_day, today);
}
