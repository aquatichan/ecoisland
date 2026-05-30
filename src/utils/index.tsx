// @ts-nocheck
export const createPageUrl = (pageName: string): string => {
  const routes: Record<string, string> = {
    "Dashboard":      "/dashboard",
    "Onboarding":     "/onboarding",
    "Island":         "/island",
    "CarbonFootprint":"/carbon-footprint",
    "RegionalData":   "/regional-data",
    "DangerScan":     "/danger-scan",
    "ActionFeed":     "/action-feed",
    "Impact":         "/impact",
    "Settings":       "/settings",
    "Leaderboard":    "/leaderboard",
    "APES":           "/apes",
  };
  return routes[pageName] || "/dashboard";
};
