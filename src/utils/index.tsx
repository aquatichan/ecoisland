// @ts-nocheck
export const createPageUrl = (pageName) => {
    const routes = {
      'Dashboard': '/dashboard',
      'Onboarding': '/onboarding',
      'Island': '/island',
      'CarbonFootprint': '/carbon-footprint',
      'RegionalData': '/regional-data',
      'DangerScan': '/danger-scan',
      'ActionFeed': '/action-feed',
      'Impact': '/impact',
      'Settings': '/settings',
      'Leaderboard': '/leaderboard',
      'APES': '/apes'
    };
    return routes[pageName] || '/dashboard';
};