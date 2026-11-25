import type { ReactNode } from 'react'

import type { PlayableMessage } from '@/lib/exercises/types'

import { plainText, type RenderText } from './views'

// Text messages drawn inside a phone. Everything around the sender and the bubbles is
// decoration: it can't be tapped, and screen readers skip it.

const isNumber = (sender: string) => /^\+?[\d\s()-]{5,}$/.test(sender.trim())
const tight = (text: RenderText) => (text === plainText ? 'leading-snug' : 'leading-12')

// Phones colour web addresses and phone numbers by themselves. Drawn, not real links.
const LINKS = /(https?:\/\/\S+|www\.\S+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?|\+?\d[\d ]{6,}\d)/gi
export const withLinks = (value: string, color: string): ReactNode =>
  value.split(LINKS).map((piece, i) =>
    i % 2 === 1 ? (
      <span key={i} className={`underline underline-offset-2 [overflow-wrap:anywhere] ${color}`}>
        {piece}
      </span>
    ) : (
      piece
    ),
  )

const bubbleText = (text: RenderText, i: number, value: string, color: string) =>
  text === plainText ? withLinks(value, color) : text(`message.bubble.${i}`, value)

function Phone({ screen, children }: { screen: string; children: ReactNode }) {
  return (
    <article className="on-paper mx-auto w-full max-w-[25rem] rounded-[3.25rem] border-2 border-[#33333a] bg-[#111114] p-2.5 font-[system-ui,sans-serif] text-[#111114] shadow-2xl">
      <div className={`relative flex min-h-[38rem] flex-col overflow-hidden rounded-[2.6rem] ${screen}`}>
        <span aria-hidden="true" className="absolute top-3 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-[#0b0b0d]" />
        {children}
      </div>
    </article>
  )
}

function Icon({ path, className = 'size-6', strokeWidth = 2 }: { path: string; className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={path} />
    </svg>
  )
}

const ICONS = {
  back: 'M15 5l-7 7 7 7',
  forward: 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
  video: 'M3 7h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM15 11l6-3v8l-6-3',
  call: 'M5 3h4l2 5-2.500 2a12 12 0 0 0 5.500 5.500L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  smile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.500 14.500a4.500 4.500 0 0 0 7 0M9 10h.01M15 10h.01',
  clip: 'M20 11l-8.500 8.500a5 5 0 0 1-7-7L13 4a3.300 3.300 0 0 1 4.700 4.700L9.300 17a1.700 1.700 0 0 1-2.400-2.400L14.500 7',
}

function Avatar({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full text-white ${className}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-1/2">
        <circle cx="12" cy="7.500" r="4.500" />
        <path d="M3 21c0-5 4-7.500 9-7.500s9 2.500 9 7.500z" />
      </svg>
    </span>
  )
}

export function SmsPhone({ message, text }: { message: PlayableMessage; text: RenderText }) {
  return (
    <Phone screen="bg-white">
      <header className="relative flex flex-col items-center border-b border-[#d8d8dc] bg-[#f3f3f6] px-4 pt-13 pb-3">
        <span aria-hidden="true" className="absolute top-14 left-3 flex items-center text-xl text-[#1a5fe0]">
          <Icon path={ICONS.back} strokeWidth={2.500} className="size-7" />
          12
        </span>
        <Avatar className="size-14 bg-gradient-to-b from-[#a3a7b2] to-[#7b7f8b]" />
        <div className="mt-2 flex max-w-full items-center gap-1">
          <strong className={`min-w-0 text-center text-xl font-semibold break-words ${tight(text)}`}>{text('message.sender', message.sender)}</strong>
          <Icon path={ICONS.forward} className="size-4 text-[#8a8a90]" />
        </div>
      </header>
      <div className="flex flex-1 flex-col px-4 pt-4 pb-3">
        <p aria-hidden="true" className="mb-3 text-center text-base text-[#5b5b62]">
          Text Message · <span className="font-semibold">Today</span> 09:41
        </p>
        <div className="flex flex-col items-start gap-2">
          {message.bubbles.map((bubble, i) => (
            <p
              key={i}
              className={`relative z-0 max-w-[94%] rounded-[1.25rem] bg-[#e3e3e8] px-4 py-2.5 text-xl break-words whitespace-pre-wrap ${tight(text)} ${
                i === message.bubbles.length - 1
                  ? 'before:absolute before:bottom-0 before:-left-1.5 before:-z-10 before:size-5 before:bg-[#e3e3e8] before:[clip-path:polygon(100%_0,100%_100%,0_100%,35%_70%)]'
                  : ''
              }`}
            >
              {bubbleText(text, i, bubble, 'text-[#1a5fe0]')}
            </p>
          ))}
        </div>
        {isNumber(message.sender) && (
          <div className="mt-auto pt-8 text-center text-base text-[#5b5b62]">
            <p>This sender is not in your contacts.</p>
            <p aria-hidden="true" className="font-semibold text-[#1a5fe0]">Report Junk</p>
          </div>
        )}
      </div>
      <div aria-hidden="true" className="flex items-center gap-2 px-4 pt-2 pb-3 text-[#5b5b62]">
        <span className="rounded-full bg-[#e6e6eb] p-2">
          <Icon path={ICONS.plus} />
        </span>
        <span className="flex flex-1 items-center justify-between rounded-full border border-[#c9c9ce] px-4 py-1.5 text-lg">
          Text Message
          <Icon path={ICONS.mic} className="size-5" />
        </span>
      </div>
      <span aria-hidden="true" className="mx-auto mb-2 h-1 w-32 rounded-full bg-[#0b0b0d]" />
    </Phone>
  )
}

export function WhatsAppPhone({ message, text }: { message: PlayableMessage; text: RenderText }) {
  return (
    <Phone screen="bg-[#ebe4da]">
      <header className="flex items-center gap-2 bg-[#14544a] px-3 pt-13 pb-3 text-white">
        <Icon path={ICONS.back} className="size-5" />
        <Avatar className="size-10 bg-[#bcc3c9]" />
        <div className="min-w-0 flex-1">
          <strong className={`block text-lg font-semibold break-words ${tight(text)}`}>{text('message.sender', message.sender)}</strong>
          <span aria-hidden="true" className="block text-base leading-tight">online</span>
        </div>
        <Icon path={ICONS.video} className="size-5" />
        <Icon path={ICONS.call} className="size-5" />
      </header>
      <div className="flex flex-1 flex-col gap-2.5 px-3 pt-3 pb-4">
        <span aria-hidden="true" className="mx-auto rounded-lg bg-white px-3 py-1 text-sm font-semibold text-[#55606a] shadow-sm">TODAY</span>
        {isNumber(message.sender) && (
          <div className="rounded-lg bg-[#fff1b8] px-3 py-2 text-center text-base text-[#54471a]">
            <p>This number is not in your contacts.</p>
            <p aria-hidden="true">
              <span className="font-bold text-[#a4212c]">Block</span> · <span className="font-bold text-[#14544a]">Add</span>
            </p>
          </div>
        )}
        {message.bubbles.map((bubble, i) => (
          <div
            key={i}
            className="relative ml-2 w-fit max-w-[94%] rounded-xl rounded-tl-none bg-white px-3 pt-2 pb-1 shadow-sm before:absolute before:top-0 before:-left-2 before:size-2.5 before:bg-white before:[clip-path:polygon(0_0,100%_0,100%_100%)]"
          >
            <p className={`text-xl break-words whitespace-pre-wrap ${tight(text)}`}>{bubbleText(text, i, bubble, 'text-[#0a6ebd]')}</p>
            <span aria-hidden="true" className="block text-right text-sm text-[#5b6770]">14:02</span>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex items-center gap-2 px-3 pb-6">
        <span className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-lg text-[#5b6770]">
          <Icon path={ICONS.smile} />
          <span className="flex-1">Message</span>
          <Icon path={ICONS.clip} />
        </span>
        <span className="rounded-full bg-[#14544a] p-3 text-white">
          <Icon path={ICONS.mic} />
        </span>
      </div>
    </Phone>
  )
}
