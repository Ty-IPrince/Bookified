'use server'

import { auth } from '@clerk/nextjs/server';
import { PLAN_LIMITS, PlanSlug } from '@/lib/subscription-constants';
import { getUserBooksCount, getMonthlySessionCount } from '@/database/queries';

export async function getUserPlan(): Promise<PlanSlug> {
  const User = await auth();
  console.log(User)
  if (User.has({ plan: 'pro' })) return 'pro';
  if (User.has({ plan: 'standard' })) return 'standard';
  return 'free';
}

export async function checkBookLimit(userId: string) {
  const plan = await getUserPlan();
  const limits = PLAN_LIMITS[plan];

  const current = await getUserBooksCount(userId);  // from queries
  console.log(`User ${userId} has created ${current} books. Plan: ${plan}, Limit: ${limits.maxBooks}`);
  if (current >= limits.maxBooks) {
    return ({ 
      success:false,
      message :  `Maximum books reached (${limits.maxBooks}) for ${plan} plan. Upgrade at /subscriptions.`});
  }
  else{
    return({
      success:true,
      message: "Maximum books not reached. You can create more books."
    })
  }
}

export async function checkSessionLimit(userId: string) {
  const plan = await getUserPlan();
  const limits = PLAN_LIMITS[plan];

  if (limits.maxSessionsPerMonth === Infinity) return { plan, limits };

  const current = await getMonthlySessionCount(userId);

  if (current >= limits.maxSessionsPerMonth) {
    return ({ 
      success:false,
      message :  "Maximum sessions reached (${limits.maxSessionsPerMonth}) for ${plan} plan. Upgrade at /subscriptions."
    });
  }
  else{
    return({
      success:true,
      message: "Maximum session not reached. You can start more sessions."
    })
}
}