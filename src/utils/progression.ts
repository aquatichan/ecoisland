// Shared XP / level / Treecoin progression logic.
// Every feature that rewards the user goes through applyXpGain so level-up
// math stays identical everywhere (Layout buy-XP, carbon logs, posts,
// danger scans, APES quizzes).

export type ProgressionFields = {
  xp: number;
  eco_level: number;
  xp_to_next_level: number;
};

export type XpGainResult = ProgressionFields & {
  leveledUp: boolean;
  levelsGained: number;
};

// Reward table — keep in sync with the amounts advertised on the Homepage.
export const REWARDS = {
  CARBON_LOG:   { tc: 10, xp: 8 },
  DANGER_SCAN:  { tc: 15, xp: 12 },
  FEED_POST:    { tc: 5,  xp: 4 },
  QUIZ_BASE_TC: 5,           // per completed quiz (score-scaled bonus added on top)
  QUIZ_MAX_BONUS_TC: 15,     // perfect-score bonus
  QUIZ_XP_PER_CORRECT: 2,
  FRQ_BASE_TC: 8,            // per AI-graded FRQ attempt (score-scaled bonus added on top)
  FRQ_MAX_BONUS_TC: 20,      // full-credit bonus
  FRQ_XP_PER_POINT: 3,       // XP per rubric point earned
  ONBOARDING_GIFT_TC: 50,
  STREAK_BONUS_TC: 5,        // extra TC for each consecutive-day carbon log
} as const;

export const XP_CURVE_MULTIPLIER = 1.2;
export const BASE_XP_TO_NEXT = 25;

/**
 * Apply an XP gain to a user's progression fields, rolling over levels as
 * needed. Pure function — pass the current user object (or any object with
 * the progression fields) and get back the updated fields.
 */
export function applyXpGain(
  user: Partial<ProgressionFields> | null | undefined,
  xpGain: number
): XpGainResult {
  let xp = (user?.xp ?? 0) + Math.max(0, xpGain);
  let level = user?.eco_level ?? 1;
  let xpNext = user?.xp_to_next_level ?? BASE_XP_TO_NEXT;
  let levelsGained = 0;

  while (xp >= xpNext) {
    xp -= xpNext;
    level += 1;
    levelsGained += 1;
    xpNext = Math.floor(xpNext * XP_CURVE_MULTIPLIER);
  }

  return {
    xp,
    eco_level: level,
    xp_to_next_level: xpNext,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

/**
 * Build the Firestore update payload for a combined Treecoin + XP reward.
 * Returns the patch plus level-up info so callers can celebrate.
 */
export function buildRewardUpdate(
  user: { treecoins?: number } & Partial<ProgressionFields>,
  reward: { tc?: number; xp?: number }
): { update: Record<string, number>; result: XpGainResult } {
  const result = applyXpGain(user, reward.xp ?? 0);
  return {
    update: {
      treecoins: Math.max(0, (user?.treecoins ?? 0) + (reward.tc ?? 0)),
      xp: result.xp,
      eco_level: result.eco_level,
      xp_to_next_level: result.xp_to_next_level,
    },
    result,
  };
}

/**
 * Compute the current daily streak from a list of ISO date strings
 * (yyyy-MM-dd). A streak counts consecutive days ending today or yesterday
 * (so it isn't broken before the user has a chance to log today).
 */
export function computeDailyStreak(dates: string[]): number {
  if (!dates || dates.length === 0) return 0;
  const unique = [...new Set(dates.filter(Boolean))].sort().reverse();

  const dayMs = 86_400_000;
  const toUtc = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1);
  };

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const latest = toUtc(unique[0]);

  // Streak must include today or yesterday to be alive.
  if (todayUtc - latest > dayMs) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (toUtc(unique[i - 1]) - toUtc(unique[i]) === dayMs) streak += 1;
    else break;
  }
  return streak;
}
