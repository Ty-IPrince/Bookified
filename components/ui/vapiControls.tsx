"use client"

import React, { useEffect } from 'react'
import { IBook } from '@/types'
import { Mic, MicOff } from "lucide-react";
import ChatTranscript from '@/components/ui/chatTranscript'
import { useVapi } from '@/hooks/useVapi'
import { toast } from 'sonner'

const VapiControls = ({ book }: { book: IBook }) => {

  const cover = book?.coverURL || '/assets/placeholder-cover.png';

  const { status, maxDuration, duration, currentMessage, currentUserMessage, start, stop, messages, limiterror, setlimiterror } = useVapi(book)

  const isActive = status !== 'idle'

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status display text with proper capitalization
  const getStatusDisplay = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'starting':
        return 'Starting...';
      case 'listening':
        return 'Listening...';
      case 'speaking':
        return 'Speaking...';
      case 'thinking':
        return 'Thinking...';
      default:
        return 'Ready';
    }
  };

  // Get status badge color based on status
  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
      case 'starting':
        return 'bg-yellow-500';
      case 'listening':
        return 'bg-blue-500';
      case 'speaking':
        return 'bg-green-500';
      case 'thinking':
        return 'bg-purple-500';
      default:
        return 'bg-green-500';
    }
  };

  // Show toast when error occurs
  useEffect(() => {
    if (limiterror) {
      toast.error(limiterror);
      setlimiterror(null);
    }
  }, [limiterror, setlimiterror]);


  return (
    <main className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-12">
        {/* 📘 Book Header */}
        <section className="bg-[#f3e4c7] rounded-2xl p-4 sm:p-6 lg:p-8 shadow-soft mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            {/* Cover Image and Mic Button */}
            <div className="relative w-[120px] h-[170px] sm:w-[140px] sm:h-[200px] flex-shrink-0">
              <img
                src={cover}
                alt={book.title}
                className="w-full h-full object-cover rounded-lg shadow-soft"
              />

              {/* 🎤 Voice Button */}
              <button
                onClick={isActive ? stop : start}
                aria-label={isActive ? 'Stop voice interaction' : 'Start voice interaction'}
                title={isActive ? 'Stop voice interaction' : 'Start voice interaction'}
                className={`vapi-mic-btn shadow-md absolute bottom-9 left-[80%] z-10 ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
                disabled={status === 'connecting'}
              >
                {isActive ? (
                  <Mic className="size-5 text-white" />
                ) : (
                  <MicOff className="size-5 text-[#212a3b]" />
                )}
              </button>
            </div>

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-[var(--text-primary)] leading-tight">
                {book.title}
              </h1>
              <p className="text-[var(--text-secondary)] mt-1 text-sm sm:text-base">
                by {book.author}
              </p>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4 sm:gap-3">
                <span className={`inline-flex items-center gap-2 ${getStatusColor()} text-white rounded-full px-3 py-1 text-xs sm:text-sm shadow-soft`}>
                  <span className="w-2 h-2 rounded-full bg-white block flex-shrink-0" />
                  {getStatusDisplay()}
                </span>

                <span className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 text-xs sm:text-sm shadow-soft">
                  Voice: {book.persona}
                </span>

                <span className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 text-xs sm:text-sm shadow-soft">
                  {formatDuration(duration)} / {formatDuration(maxDuration)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Chat Transcript Section */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-soft-md min-h-[380px] sm:min-h-[450px]">
          <div className="w-full h-full">
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
