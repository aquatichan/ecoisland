// Firestore document shapes shared by the app and the server.

import type { DayKey } from "./dates";
import type { SkyId, DecorId } from "./catalog";

export type Role = "student" | "teacher";

export type PlacedDecor = { id: DecorId; x: number; y: number };

/** users/{uid}. Fields marked (server) can only be written by the server. */
export type UserDoc = {
  id: string;
  email?: string; // (server) never shown to other users
  full_name?: string;
  username?: string;
  username_lower?: string;
  avatar_url?: string;
  role?: Role;
  onboarding_complete?: boolean;
  preferences?: { theme?: "light" | "dark" | "system" };
  email_reminders?: boolean;
  focus_unit?: number | null;
  last_lesson?: { id: string; unit: number; at: string } | null;
  island_name?: string;
  island_skybox?: SkyId;
  island_decor?: PlacedDecor[];

  // (server) economy and progress
  treecoins?: number;
  lifetime_tc?: number;
  xp_total?: number;
  streak?: number;
  streak_best?: number;
  last_set_day?: DayKey;
  set_days?: DayKey[];
  lessons_done?: string[];
  unit_best?: Record<string, number>;
  quiz_best?: Record<string, number>;
  frq_best?: Record<string, number>;
  quests_done?: number[];
  owned_items?: string[];
  class_ids?: string[];
  teaching_ids?: string[];
  week_key?: string;
  week_xp?: number;
  last_week_xp?: number;
  week_sets?: number;
  economy_version?: number;
  created_date?: string;

  // (server) Act
  hours_verified?: number;
  rsvp_events?: string[];
  actions_done?: string[];
  ambassador?: boolean;
  ambassador_region?: string;
};

/** classes/{classId}. */
export type ClassDoc = {
  id: string;
  name: string;
  code: string;
  teacher_id: string;
  teacher_name: string;
  current_unit?: number | null;
  test_day?: DayKey | null;
  test_label?: string | null;
  member_count?: number;
  /** Class chat is off until the teacher turns it on. */
  chat_enabled?: boolean;
  created_at?: string;
};

/** classes/{classId}/members/{uid}. Written by the server only. */
export type MemberDoc = {
  uid: string;
  username: string;
  avatar_url?: string;
  joined_at?: string;
  xp_total: number;
  streak: number;
  last_active_day?: DayKey | null;
  week_key?: string;
  week_xp?: number;
  last_week_xp?: number;
  week_sets?: number;
  unit_best?: Record<string, number>;
  lessons_count?: number;
  island_skybox?: SkyId;
  island_decor?: PlacedDecor[];
  island_name?: string;
  last_set_day?: DayKey | null;
  masteries?: number[];
  /** (server) Set by the teacher: can read chat but not post. */
  muted?: boolean;
  hours_verified?: number;
  actions_count?: number;
  ambassador?: boolean;
};

/** classes/{classId}/assignments/{aid}/submissions/{uid}. Written by the server only. */
export type SubmissionDoc = {
  uid: string;
  username: string;
  done: boolean;
  progress: number;
  target: number;
  score: number | null;
  completed_at?: string | null;
  completed_day?: DayKey | null;
  late?: boolean;
  updated_at?: string;
};

/** classes/{classId}/notes/{id}. Field notes from quests and eco actions. */
export type NoteDoc = {
  id: string;
  uid: string;
  username: string;
  avatar_url?: string;
  unit: number | null;
  /** "action" for eco action write-ups; quests leave it unset. */
  kind?: "action";
  event_key?: string;
  title: string;
  text: string;
  created_at: string;
};

/** classes/{classId}/messages/{id}. Class chat, written by the server only. */
export type MessageDoc = {
  id: string;
  uid: string;
  name: string;
  avatar_url?: string;
  role: Role;
  text: string;
  created_at: string;
  deleted?: boolean;
  deleted_by?: "author" | "teacher";
  reported?: boolean;
  reports?: string[];
};
