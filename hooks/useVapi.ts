'use client';

import { startVoiceSession, endVoiceSession } from "@/lib/actions/session.action";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { IBook, Messages } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { useState, useRef, useEffect, useCallback } from "react";
import Vapi from '@vapi-ai/web';
import { getVoice } from "@/lib/utils";
import { getUserPlan } from "@/lib/billing.server";
import { PLAN_LIMITS } from "@/lib/subscription-constants";
import { toast } from "sonner";

export type Callstatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';

const useLatestRef = <T,>(value: T) => {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
};

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
let vapi: InstanceType<typeof Vapi>;

function getVapi() {
  if (!vapi) {
    if (!VAPI_API_KEY) throw new Error('NEXT_PUBLIC_VAPI_API_KEY not set');
    vapi = new Vapi(VAPI_API_KEY);
  }
  return vapi;
}

export const useVapi = (book: IBook) => {
  const { userId } = useAuth();

  const [status, setstatus] = useState<Callstatus>('idle');
  const [messages, setmessages] = useState<Messages[]>([]);
  const [currentMessage, setcurrentMessage] = useState('');      // Assistant streaming
  const [currentUserMessage, setcurrentUserMessage] = useState(''); // User streaming
  const [isActive, setisActive] = useState<boolean>(false)
  const [duration, setduration] = useState<number>(0);
  const [maxDuration, setmaxDuration] = useState<number>(0);
  const [limiterror, setlimiterror] = useState<string | null>(null);

  const isStoppingRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const maxDurationRef = useRef<number>(0);

  const bookRef = useLatestRef(book);
  const durationRef = useLatestRef(duration);
  const maxDurationRefLatest = useLatestRef(maxDuration);

  const voice = book.persona ? book.persona : DEFAULT_VOICE;

  // === VAPI EVENT LISTENERS ===
  useEffect(() => {
    const handlers = {
      'call-start': () => {
        isStoppingRef.current = false;
        setstatus('starting');
        setcurrentMessage('');
        setcurrentUserMessage('');
        startTimeRef.current = Date.now();
        setduration(0);

        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const newDur = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setduration(newDur);
            
            // Check if max duration exceeded
            if (maxDurationRef.current > 0 && newDur >= maxDurationRef.current) {
              console.log(`Max duration of ${maxDurationRef.current}s reached. Auto-stopping session.`);
              isStoppingRef.current = true;
              
              // Show toast notification
              toast.error(`Session time limit (${maxDurationRef.current}s) reached. Stopping session.`);
              
              // Auto-stop the session
              getVapi().stop().catch(err => {
                console.warn('Error stopping vapi on max duration', err);
              });
            }
          }
        }, 1000);
      },

      'call-end': () => {
        setstatus('idle');
        setcurrentMessage('');
        setcurrentUserMessage('');
        if (timerRef.current) clearInterval(timerRef.current);
        
        // End the voice session in database
        if (sessionIdRef.current && duration > 0) {
          endVoiceSession(sessionIdRef.current, duration).catch(err => {
            console.error('Error ending voice session', err);
          });
        }
      },

      'speech-start': () => { if (!isStoppingRef.current) setstatus('speaking'); },
      'speech-end': () => { if (!isStoppingRef.current) setstatus('listening'); },

      // Core: Message / Transcript handler
      message: (msg: {
        type: string;
        role: 'user' | 'assistant';
        transcriptType: 'partial' | 'final';
        transcript: string;
      }) => {
        if (msg.type !== 'transcript') return;

        // User partial → live typing
        if (msg.role === 'user' && msg.transcriptType === 'partial') {
          setcurrentUserMessage(msg.transcript);
          return;
        }

        // User final → commit + thinking
        if (msg.role === 'user' && msg.transcriptType === 'final') {
          if (!isStoppingRef.current) setstatus('thinking');
          setcurrentUserMessage(''); // clear live

          setmessages(prev => [...prev, { role: 'user', content: msg.transcript }]);
          return;
        }

        // Assistant partial → streaming
        if (msg.role === 'assistant' && msg.transcriptType === 'partial') {
          setcurrentMessage(msg.transcript);
          return;
        }

        // Assistant final → commit + clear
        if (msg.role === 'assistant' && msg.transcriptType === 'final') {
          setcurrentMessage('');
          setmessages(prev => [...prev, { role: 'assistant', content: msg.transcript }]);
          if (!isStoppingRef.current) setstatus('listening');
        }
      },

      error: (err: any) => {
        console.error(err);
        setstatus('idle');
        setcurrentMessage('');
        setcurrentUserMessage('');
        if (timerRef.current) clearInterval(timerRef.current);
        setlimiterror('Voice session error');
      }
    };

    const client = getVapi();
    Object.entries(handlers).forEach(([event, handler]) => {
      client.on(event as any, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        client.off(event as any, handler);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    if (!userId) return setlimiterror('Please login to start conservation')

    setlimiterror(null)
    setstatus('connecting')

    try {
      // Get user's plan to determine max session duration
      const userPlan = await getUserPlan();
      const planLimits = PLAN_LIMITS[userPlan];
      const maxSessionSeconds = planLimits.maxSessionMinutes * 60;
      
      setmaxDuration(maxSessionSeconds);
      maxDurationRef.current = maxSessionSeconds;

      const result = await startVoiceSession(userId, book._id)

      if (!result.success) {
        setlimiterror(result.error || 'session limit reached. Please upgrade your plan');
        setstatus('idle');
        toast.error(result.error || 'Session limit reached. Please upgrade your plan.');
        return;
      }

      sessionIdRef.current = result.sessionId || null;

      const firstMessage = `Hay, good to meet you. Quick question, befoure dive in: have you actually read ${book.title} yet? Or we starting fresh?`

      await getVapi().start(ASSISTANT_ID, {
                firstMessage,
                variableValues: {
                    title: book.title,
                    author: book.author,
                    bookId: book._id,
                },
                voice: {
                    provider: '11labs' as const,
                    voiceId: getVoice(voice).id,
                    model: 'eleven_turbo_v2_5' as const,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
                },
            });

    } catch (e) {
      console.error('error starting call', e)
      const msg = typeof e === 'string' ? e : (e ?? JSON.stringify(e))
      if (/eject|ejected|ejection|meeting ended?/i.test(String(msg))) {
        setlimiterror(String(msg))
        toast.error(String(msg));
      } else {
        setlimiterror('An error occurred while starting the call')
        toast.error('An error occurred while starting the call');
      }
      setstatus('idle')
    }
  }, [book._id, book.title, book.author, voice, userId]);

  const stop = useCallback(async () => {
    isStoppingRef.current = true
    try {
      const client = getVapi()
      await client.stop();
      
      // End the voice session in database
      if (sessionIdRef.current && duration > 0) {
        await endVoiceSession(sessionIdRef.current, duration);
      }
    } catch (err) {
      console.warn('error stopping vapi', err)
    }
    
    setstatus('idle')
    setcurrentMessage('')
    setcurrentUserMessage('')
    toast.success('Voice session ended');

  }, [duration])

  
  return {
    status,
    isActive,
    duration,
    maxDuration,
    messages,
    currentMessage,
    currentUserMessage,
    start,
    stop,
    limiterror,
    setlimiterror,
  }

}