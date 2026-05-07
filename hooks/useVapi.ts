
import { startVoiceSession } from "@/lib/actions/session.action";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { IBook, Messages } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import Vapi from '@vapi-ai/web'
import { getVoice } from "@/lib/utils";


export type Callstatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';


const useLatestRef = <T,>(value: T) => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value
  }, [value]);

  return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY
let vapi: InstanceType<typeof Vapi>

function getVapi() {
  if (!vapi) {
    if (!VAPI_API_KEY) {
      throw new Error('NEXT_PUBLIC_VAPI_API_KEY not founded . Please set in .env file')
    }

    vapi = new Vapi(VAPI_API_KEY);
  }
  return vapi;
}

export const useVapi = (book: IBook) => {
  const { userId } = useAuth()
  // Todo : Implement Limits.

  const [status, setstatus] = useState<Callstatus>('idle')
  const [messages, setmessages] = useState<Messages[]>([])
  const [currentMessage, setcurrentMessage] = useState('')
  const [currentUserMessage, setcurrentUserMessage] = useState('')
  const [duration, setduration] = useState<number | null>(0)
  const [limiterror, setlimiterror] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const bookRef = useLatestRef<IBook>(book);
  const durationRef = useLatestRef<number | null>(duration);
  const voice = book.persona ? book.persona : DEFAULT_VOICE;

  /*
  Limits:
  const maxDurationRef = useLetestRef(limits.maxSessionMinutes * 60)
  const maxDurationSeconds
  const remainingSeconds
  const showTimerWarning
  */

  const isActive = status === 'listening' || status === 'thinking' || status === 'speaking' || status === 'starting'

  const vapiListenerRef = useRef<{ client?: any; handler?: any; errHandler?: any; termHandler?: any; unsub?: any } | null>(null)


  const start = async () => {
    if (!userId) return setlimiterror('Please login to start conservation')

    setlimiterror(null)
    setstatus('connecting')

    try {
      const result = await startVoiceSession(userId, book._id)

      if (!result.success) {
        setlimiterror(result.error || 'session limit reached. Please upgrade your plan');
        setstatus('idle');
        return;
      }

      sessionIdRef.current = result.sessionId || null;

      const firstMessage = `Hay, good to meet you. Quick question, befoure dive in: have you actually read ${book.title} yet? Or we starting fresh?`

      const client = getVapi()

    } catch (e) {
      console.error('error starting call', e)
      const msg = typeof e === 'string' ? e : (e ?? JSON.stringify(e))
      if (/eject|ejected|ejection|meeting ended?/i.test(String(msg))) {
        setlimiterror(String(msg))
      } else {
        setlimiterror('An error occurred while starting the call')
      }
      setstatus('idle')
    }
  }
  const stop = async () => {
    isStoppingRef.current = true
    try {
      const client = getVapi()
      // tell vapi to stop streaming
      if (client && typeof client.stop === 'function') await client.stop()
    } catch (err) {
      console.warn('error stopping vapi', err)
    }
    
    setstatus('idle')
    setcurrentMessage('')
    setcurrentUserMessage('')

  }
  const clearError = async () => {

  }

  
  return {
    status,
    isActive,
    duration,
    messages,
    currentMessage,
    currentUserMessage,
    start,
    stop,
  }

}