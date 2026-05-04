"use client"

import React, { useEffect, useRef } from 'react'
import { Mic } from 'lucide-react'
import { Messages } from '@/types'

interface TranscriptProps {
  messages?: Messages[]
  currentUserMessage?: string
  currentMessage?: string
}

const ChatTranscript = ({
  messages = [],
  currentUserMessage = '',
  currentMessage = '',
}: TranscriptProps) => {
  const isEmpty = messages.length === 0 && !currentMessage && !currentUserMessage

  if (isEmpty) {
    return (
      <div className="vapi-transcript-wrapper bg-white rounded-2xl p-12 shadow-soft-md min-h-[380px] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-[var(--accent-light)] flex items-center justify-center shadow-soft mb-4">
            <Mic className="size-12 text-[#212a3b] mb-4" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">No conversation yet</h2>
          <p className="text-[var(--text-muted)] mt-2">Tap the mic to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user'

        return (
          <div
            key={index}
            className={`message-row ${isUser ? 'user-row' : 'assistant-row'} message-enter`}
          >
            <div className={isUser ? 'user-bubble' : 'assistant-bubble'}>{msg.content}</div>
          </div>
        )
      })}

      {currentUserMessage && (
        <div className="message-row user-row message-enter">
          <div className="user-bubble opacity-80">{currentUserMessage}</div>
        </div>
      )}

      {currentMessage && (
        <div className="message-row assistant-row message-enter">
          <div className="assistant-bubble">
            {currentMessage}
            <span className="transcript-cursor" />
          </div>
        </div>
      )}

      {!currentMessage && currentUserMessage && (
        <div className="message-row assistant-row">
          <div className="typing-indicator">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      )}

    </div>
  )
}

export default ChatTranscript
/*
wire the vapi eventlistuner . Use vapi hook to track converasation messages . listen for messege event type transcript and hendle in different use casea
- the user partial , which update current user messege state with live transcript
- the user final ,which is going to be transcript type of final, where we can clear the current user messege and setstatus to thinking and the messege to messege arrey
- same thing for the assistance partial and final messege .
Then duplicate final messegesbefoure appending and pass messeges,current messege add current messege nad current user messeges toto transcript componet so both streming and completed messeges reder in real time.
*/