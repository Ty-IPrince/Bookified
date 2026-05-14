
    export const getCurrentBillingPeriodStart = (): Date => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    };

export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  STANDARD: 'standard',
  PRO: 'pro',
};

export type PlanSlug = typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];

export const PLAN_LIMITS = {
  [SUBSCRIPTION_PLANS.FREE]: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxSessionMinutes: 5,
    hasHistory: false,
  },
  [SUBSCRIPTION_PLANS.STANDARD]: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxSessionMinutes: 15,
    hasHistory: true,
  },
  [SUBSCRIPTION_PLANS.PRO]: {
    maxBooks: 100,
    maxSessionsPerMonth: Infinity,
    maxSessionMinutes: 60,
    hasHistory: true,
  },
};