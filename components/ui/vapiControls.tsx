"use client"

import React from 'react'
import { IBook } from '@/types'
import { Mic, MicOff } from "lucide-react";
import ChatTranscript from '@/components/ui/chatTranscript'
import { useVapi } from '@/hooks/useVapi'

const VapiControls = ({ book }: { book: IBook }) => {

  const cover = book?.coverURL || '/assets/placeholder-cover.png';
  const duration = '15:00';

  const { status, currentMessage, currentUserMessage, start, stop, messages } = useVapi(book)

  const isActive = status !== 'idle'


  return (
    <main className="book-page-container">
      <div className="wrapper">
        {/* 📘 Book Header */}
        <section className="bg-[#f3e4c7] rounded-2xl p-6 md:p-8 shadow-soft mb-8">
          <div className="flex items-center gap-6">
            <div className="relative w-[120px] h-[170px]">
              <img
                src={cover}
                alt={book.title}
                className="w-full h-full object-cover rounded-lg"
              />

              {/* 🎤 Voice Button */}
              <button
                onClick={isActive ? stop : start}
                aria-label={isActive ? 'Stop voice interaction' : 'Start voice interaction'}
                title={isActive ? 'Stop voice interaction' : 'Start voice interaction'}
                className={`vapi-mic-btn shadow-md bottom-7 left-[75%] absolute !w-[50px] !h-[50px] z-10 ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
                disabled={status === 'connecting'}
              >
                {isActive ? (
                  <Mic className="size-5 text-white" />
                ) : (
                  <MicOff className="size-5 text-[#212a3b]" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <h1 className="book-title-lg">{book.title}</h1>
              <p className="text-[var(--text-secondary)] mt-1">
                by {book.author}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 text-sm shadow-soft">
                  <span className="w-2 h-2 rounded-full bg-green-500 block" />
                  Ready
                </span>

                <span className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 text-sm shadow-soft">
                  Voice: {book.persona}
                </span>

                <span className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 text-sm shadow-soft">
                  0:00 / {duration}
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-white rounded-2xl p-12 shadow-soft-md min-h-[380px]">
          <div className="w-full">
            <ChatTranscript
              messages={messages}
              currentMessage={currentMessage}
              currentUserMessage={currentUserMessage}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default VapiControls
