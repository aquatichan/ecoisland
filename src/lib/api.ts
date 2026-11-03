// Client for the Worker API (worker/). Every call is authenticated with the
// signed-in student's Firebase ID token and carries their local "today".
import { localDayKey } from "@/shared/dates";
import type { CompletedAssignment } from "@/lib/types";
import { auth } from "./firebase";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ day: localDayKey(), ...body }),
    });
  } catch {
    throw new ApiError(0, "offline", "Can't reach Ecoisland. Check your internet connection and try again.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? `Something went wrong (${res.status}).`);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

// ─── Response shapes ────────────────────────────────────────────────────────

export type Reward = { tc: number; xp: number };
export type PublicState = { treecoins: number; xp_total: number; streak: number; last_set_day: string | null };

export type DailySetResult = {
  already: boolean;
  reward: Reward;
  streak: number;
  correct: number;
  total: number;
  completed: CompletedAssignment[];
  state: PublicState;
};

export type QuizResult = {
  reward: Reward;
  capped: boolean;
  score: number;
  newLandmark: number | null;
  completed: CompletedAssignment[];
  state: PublicState;
};

/** /api/attempt/finish: a daily set or a quiz, scored by the server. */
export type AttemptResult = {
  reward?: Reward;
  correct?: number;
  total?: number;
  already?: boolean;
  streak?: number;
  capped?: boolean;
  score?: number;
  newLandmark?: number | null;
  completed?: CompletedAssignment[];
  state?: PublicState;
  /** True when this attempt had already been saved (a retried request). */
  replay?: boolean;
};

export type LessonResult = { already: boolean; reward: Reward; completed: CompletedAssignment[]; state: PublicState };

export type FrqGradeResult = {
  grade: {
    parts: { label: string; pointsEarned: number; pointsPossible: number; feedback: string }[];
    totalEarned: number;
    totalPossible: number;
    overallFeedback: string;
  };
  reward: Reward;
  capped: boolean;
  completed: CompletedAssignment[];
  state: PublicState;
};

export type QuestResult = { reward: Reward; completed: CompletedAssignment[]; state: PublicState };
export type PurchaseResult = { treecoins: number; owned_items: string[] };

// ─── Server capabilities ────────────────────────────────────────────────────

export type ServerHealth = { ok: boolean; configured: boolean; grading: boolean; reminders: boolean };
let healthPromise: Promise<ServerHealth | null> | null = null;

export function serverHealth(): Promise<ServerHealth | null> {
  if (!healthPromise) {
    healthPromise = fetch("/api/health")
      .then((r) => (r.ok ? (r.json() as Promise<ServerHealth>) : null))
      .catch(() => null);
  }
  return healthPromise;
}
