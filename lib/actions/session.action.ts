'use server'

import { auth } from '@clerk/nextjs/server'
import VoiceSession from "@/database/models/voiceSession.model";
import { connectToDatabase } from "@/database/mongoose";
import { StartSessionResult } from "@/types"
import { getCurrentBillingPeriodStart } from "../subscription-constants";
import { checkSessionLimit } from '@/lib/billing.server';
import { getMonthlySessionCount } from '@/database/queries';

export const startVoiceSession = async (_clerkId : string , bookId : string) : Promise<StartSessionResult>=>{
    try{
        await connectToDatabase()
        const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const limits = await checkSessionLimit(userId);  
    if (limits.success === false) {
        return {
            success: false,
            error: limits.message || "Session limit reached. Please upgrade your plan."
        }
    }

        const session = await VoiceSession.create({
            clerkId: userId,
            bookId,
            startedAt : new Date(),
            billingPeriodStart : getCurrentBillingPeriodStart(),
            durationSeconds : 0,
        });

        return{
            success : true,
            sessionId : session._id.toString(),
        }
    }catch(e){
        console.error('Error Starting Voice Session', e);
        return{success: false , error : "Failed to start voice session. Please try again later..."}

    }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number) : Promise<{ success: boolean; error?: string }> => {
    try{
        await connectToDatabase();

        const updated = await VoiceSession.findByIdAndUpdate(
            sessionId,
            { endedAt: new Date(), durationSeconds},
        );

        if(!updated){
            return { success: false, error: 'Voice session not found' }
        }

        return { success: true };
    }catch(e){
        console.error('Error ending voice session', e);
        return { success: false, error: 'Failed to end voice session. Please try again later...' }
    }
}
