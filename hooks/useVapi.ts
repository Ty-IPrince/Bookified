
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

      // helper: attach listeners for transcript / message events
      const attachListeners = (c: any) => {
        if (!c) return

        const handler = (evt: any) => {
          const payload = evt?.data ?? evt ?? {}

          // support several shapes from different VAPI versions
          const msg = payload?.message ?? payload

          // state updates
          const state = payload?.state || msg?.state
          if (state) {
            // try to map state to Callstatus
            if (['idle', 'connecting', 'starting', 'listening', 'thinking', 'speaking'].includes(state)) {
              setstatus(state as Callstatus)
            }
          }

          // normalize transcript object
          const transcript = msg?.type === 'transcript' ? msg : (msg?.transcript ?? msg)

          const text = transcript?.text ?? transcript?.content ?? transcript?.transcript ?? payload?.text ?? payload?.content
          const roleRaw = transcript?.role ?? transcript?.speaker ?? transcript?.from ?? payload?.speaker
          const isFinal = transcript?.final ?? transcript?.isFinal ?? (transcript?.type === 'final' || transcript?.partial === false)

          if (!text) return

          const role = roleRaw === 'assistant' ? 'assistant' : 'user'

          if (role === 'user') {
            if (!isFinal) {
              setcurrentUserMessage(text)
            } else {
              // final user message: append and clear streaming user message
              setcurrentUserMessage('')
              setmessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].role === 'user' && prev[prev.length - 1].content === text) return prev
                return [...prev, { role: 'user', content: text }]
              })
              setstatus('thinking')
            }
          } else {
            // assistant
            if (!isFinal) {
              setcurrentMessage(text)
              setstatus('speaking')
            } else {
              // final assistant message: append and clear streaming assistant message
              setmessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === text) return prev
                return [...prev, { role: 'assistant', content: text }]
              })
              setcurrentMessage('')
              setstatus('listening')
            }
          }
        }

        // register handlers in a best-effort, defensive way
        try {
          if (typeof c.on === 'function') {
            c.on('message', handler)
            c.on('transcript', handler)
            c.on('state', handler)
            // capture SDK error events to avoid unhandled exceptions
            const errHandler = (err: any) => {
              console.error('Vapi error event', err)
              const msg = typeof err === 'string' ? err : (err?.message ?? JSON.stringify(err))
              setlimiterror(msg || 'An unknown VAPI error occurred')
              setstatus('idle')
              if (!isStoppingRef.current) {
                isStoppingRef.current = true
                  // call stop to cleanup
                  ; (async () => { try { await stop() } catch (e) { } })()
              }
            }

            // handle meeting termination/ejection events
            const termHandler = (payload: any) => {
              try {
                const p = payload?.data ?? payload ?? {}
                const reason = p?.reason ?? p?.message ?? p?.detail ?? (typeof payload === 'string' ? payload : undefined)
                const text = reason ? String(reason) : 'Meeting ended'
                console.warn('Vapi meeting termination', text)
                setlimiterror(text)
                setstatus('idle')
                // clear streaming text
                setcurrentMessage('')
                setcurrentUserMessage('')
                // detach and stop
                if (!isStoppingRef.current) {
                  isStoppingRef.current = true
                    ; (async () => { try { await stop() } catch (e) { } })()
                }
              } catch (e) {
                console.warn('termHandler error', e)
              }
            }
            // also listen for an "unhandledError" or similar event name some SDKs emit
            if (typeof c.on === 'function') {
              c.on('error', errHandler)
              c.on('unhandledError', errHandler)
              c.on('meetingEnded', termHandler)
              c.on('meeting-ended', termHandler)
              c.on('ended', termHandler)
              c.on('end', termHandler)
              c.on('close', termHandler)
              c.on('disconnect', termHandler)
              c.on('ejected', termHandler)
              c.on('kicked', termHandler)
            }
            vapiListenerRef.current = { client: c, handler, errHandler, termHandler }
            return
          }

          if (typeof c.addEventListener === 'function') {
            c.addEventListener('message', handler)
            c.addEventListener('transcript', handler)
            const errHandler = (err: any) => {
              console.error('Vapi error event', err)
              const msg = typeof err === 'string' ? err : (err?.message ?? JSON.stringify(err))
              setlimiterror(msg || 'An unknown VAPI error occurred')
              setstatus('idle')
              if (!isStoppingRef.current) {
                isStoppingRef.current = true
                  ; (async () => { try { await stop() } catch (e) { } })()
              }
            }
            const termHandler = (payload: any) => {
              try {
                const p = payload?.data ?? payload ?? {}
                const reason = p?.reason ?? p?.message ?? p?.detail ?? (typeof payload === 'string' ? payload : undefined)
                const text = reason ? String(reason) : 'Meeting ended'
                console.warn('Vapi meeting termination', text)
                setlimiterror(text)
                setstatus('idle')
                setcurrentMessage('')
                setcurrentUserMessage('')
                if (!isStoppingRef.current) {
                  isStoppingRef.current = true
                    ; (async () => { try { await stop() } catch (e) { } })()
                }
              } catch (e) {
                console.warn('termHandler error', e)
              }
            }
            if (typeof c.addEventListener === 'function') {
              try { c.addEventListener('error', errHandler) } catch (e) { }
              try { c.addEventListener('meetingEnded', termHandler) } catch (e) { }
              try { c.addEventListener('meeting-ended', termHandler) } catch (e) { }
              try { c.addEventListener('ended', termHandler) } catch (e) { }
              try { c.addEventListener('end', termHandler) } catch (e) { }
              try { c.addEventListener('close', termHandler) } catch (e) { }
            }
            vapiListenerRef.current = { client: c, handler, errHandler, termHandler }
            return
          }

          if (typeof c.subscribe === 'function') {
            const unsub = c.subscribe(handler)
            // subscribe-based clients may also provide an error channel
            vapiListenerRef.current = { client: c, unsub }
            return
          }
        } catch (err) {
          console.warn('Failed to attach vapi listeners', err)
        }
      }

      const detachListeners = () => {
        const ref = vapiListenerRef.current
        if (!ref) return
        const c = ref.client
        const h = ref.handler
        const eh = ref.errHandler
        const th = ref.termHandler
        try {
          if (c) {
            if (typeof c.off === 'function' && h) {
              c.off('message', h)
              c.off('transcript', h)
              c.off('state', h)
              if (eh) {
                try { c.off('error', eh) } catch (e) { }
                try { c.off('unhandledError', eh) } catch (e) { }
              }
              if (th) {
                try { c.off('meetingEnded', th) } catch (e) { }
                try { c.off('meeting-ended', th) } catch (e) { }
                try { c.off('ended', th) } catch (e) { }
                try { c.off('end', th) } catch (e) { }
                try { c.off('close', th) } catch (e) { }
                try { c.off('disconnect', th) } catch (e) { }
                try { c.off('ejected', th) } catch (e) { }
                try { c.off('kicked', th) } catch (e) { }
              }
            } else if (typeof c.removeEventListener === 'function' && h) {
              c.removeEventListener('message', h)
              c.removeEventListener('transcript', h)
              if (eh) {
                try { c.removeEventListener('error', eh) } catch (e) { }
              }
              if (th) {
                try { c.removeEventListener('meetingEnded', th) } catch (e) { }
                try { c.removeEventListener('meeting-ended', th) } catch (e) { }
                try { c.removeEventListener('ended', th) } catch (e) { }
                try { c.removeEventListener('end', th) } catch (e) { }
                try { c.removeEventListener('close', th) } catch (e) { }
              }
            } else if (ref.unsub) {
              try { ref.unsub() } catch (e) { }
            }
          }
        } catch (err) {
          console.warn('Failed to detach vapi listeners', err)
        }
        vapiListenerRef.current = null
      }

      attachListeners(client)

      await client.start(ASSISTANT_ID, {
        firstMessage,
        variableValues: {
          title: book.title, author: book.author, bookId: book._id
        },
        voice: {
          provider: '11labs' as const,
          voiceId: getVoice(voice).id,
          model: "eleven_turbo_v2_5",
          stability: VOICE_SETTINGS.stability,
          style: VOICE_SETTINGS.style,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        }
      })
      setstatus('starting')
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

    // detach listeners and clear UI state
    if (vapiListenerRef.current) {
      try {
        const ref = vapiListenerRef.current
        const c = ref.client
        const h = ref.handler
        const eh = ref.errHandler
        if (c) {
          if (typeof c.off === 'function' && h) {
            c.off('message', h)
            c.off('transcript', h)
            c.off('state', h)
            if (eh) {
              try { c.off('error', eh) } catch (e) { }
              try { c.off('unhandledError', eh) } catch (e) { }
            }
          } else if (typeof c.removeEventListener === 'function' && h) {
            c.removeEventListener('message', h)
            c.removeEventListener('transcript', h)
            if (eh) {
              try { c.removeEventListener('error', eh) } catch (e) { }
            }
          } else if (ref.unsub) {
            try { ref.unsub() } catch (e) { }
          }
        }
      } catch (err) {
        console.warn('Failed to detach vapi listeners on stop', err)
      }
      vapiListenerRef.current = null
    }

    setmessages(prev => {
      const updated = [...prev];

      if (currentUserMessage.trim()) {
        updated.push({ role: 'user', content: currentUserMessage });
      }

      if (currentMessage.trim()) {
        updated.push({ role: 'assistant', content: currentMessage });
      }

      return updated;
    });
    setstatus('idle')
    setcurrentMessage('')
    setcurrentUserMessage('')

  }
  const clearError = async () => {

  }

  // cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (vapiListenerRef.current) {
        try {
          const ref = vapiListenerRef.current
          const c = ref.client
          const h = ref.handler
          const eh = ref.errHandler
          if (c) {
            if (typeof c.off === 'function' && h) {
              c.off('message', h)
              c.off('transcript', h)
              c.off('state', h)
              if (eh) {
                try { c.off('error', eh) } catch (e) { }
                try { c.off('unhandledError', eh) } catch (e) { }
              }
            } else if (typeof c.removeEventListener === 'function' && h) {
              c.removeEventListener('message', h)
              c.removeEventListener('transcript', h)
              if (eh) {
                try { c.removeEventListener('error', eh) } catch (e) { }
              }
            } else if (ref.unsub) {
              try { ref.unsub() } catch (e) { }
            }
          }
        } catch (err) {
          console.warn('Failed to detach vapi listeners on unmount', err)
        }
        vapiListenerRef.current = null
      }
    }
  }, [])

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