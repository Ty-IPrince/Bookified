'use server'

import VoiceSession from "@/database/models/voiceSession.model";
import { connectToDatabase } from "@/database/mongoose";
import { StartSessionResult } from "@/types"
import { getCurrentBillingPeriodStart } from "../subsciption-constants";

export const startVoiceSession = async (clerkId : string , bookId : string) : Promise<StartSessionResult>=>{
    try{
        await connectToDatabase()

        // Limits/Plan to see wheater sesson is allowed
        
        const session = await VoiceSession.create({
            clerkId ,
            bookId,
            startedAt : new Date(),
            billingPeriodStart : getCurrentBillingPeriodStart(),
            durationSeconds : 0,
        });

        return{
            success : true,
            sessionId : session._id.toString(),
            // maxDurationMinutes : check.maxDurationMinutes,
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