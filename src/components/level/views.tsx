import type { ReactNode } from 'react'

import type { PlayableEmail, PlayableLink, PlayableMessage } from '@/lib/exercises/types'

import { SmsPhone, WhatsAppPhone, withLinks } from './phones'

// `text` decides how each piece is drawn: plain, or split into tappable words in red-flags levels.
export type RenderText = (segment: string, value: string) => ReactNode

export const plainText: RenderText = (_, value) => value

// Tappable words need 48px of height each, so those lines sit further apart.
export const lines = (text: RenderText) => (text === plainText ? 'leading-loose' : 'leading-12')

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?'

// Drawn like a mail app. "Postbox", the initials and the time are decoration.
export function EmailView({ email, text = plainText }: { email: PlayableEmail; text?: RenderText }) {
  const spaced = text === plainText ? 'leading-snug' : 'leading-12'
  return (
    <article className="on-paper overflow-hidden rounded-2xl bg-paper text-[#16171d]">
      <div aria-hidden="true" className="flex items-center gap-3 border-b border-[#d5d6e0] bg-[#eaebf0] px-5 py-3">
        <svg viewBox="0 0 24 18" className="h-5 w-auto">
          <rect width="24" height="18" rx="2" fill="#1f4fc4" />
          <path d="M3 4l9 6.500L21 4" fill="none" stroke="white" strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-bold">Postbox</span>
        <span className="text-[#4a4b55]">Inbox</span>
      </div>
      <div className="p-5 sm:p-8">
        <h2 className={`text-2xl font-bold break-words sm:text-3xl ${spaced}`}>{text('email.subject', email.subject)}</h2>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#dcdde2] pb-5">
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#1c5b7d] text-xl font-bold text-white">
            {initials(email.fromName)}
          </span>
          <div className="min-w-0 flex-1 basis-48 leading-snug">
            <strong className={`block break-words ${spaced}`}>{text('email.fromName', email.fromName)}</strong>
            <span className={`block text-[1.0625rem] [overflow-wrap:anywhere] text-[#3d3e48] ${spaced}`}>{text('email.fromAddress', email.fromAddress)}</span>
          </div>
          <span aria-hidden="true" className="text-[1.0625rem] text-[#4a4b55]">Today, 09:12</span>
        </div>
        <div className={`mt-5 break-words whitespace-pre-wrap ${text === plainText ? 'leading-relaxed' : 'leading-12'}`}>
          {text === plainText ? withLinks(email.body, 'text-[#1a47b8]') : text('email.body', email.body)}
        </div>
      </div>
    </article>
  )
}

// SMS and WhatsApp are drawn as a phone screen, without logos. Messenger is a simple chat.
export function ChatView({ message, text = plainText }: { message: PlayableMessage; text?: RenderText }) {
  if (message.platform === 'sms') return <SmsPhone message={message} text={text} />
  if (message.platform === 'whatsapp') return <WhatsAppPhone message={message} text={text} />
  return (
    <article className="on-paper overflow-hidden rounded-2xl text-ink">
      <header className="border-b border-mist bg-white px-5 py-3">
        <strong className={`block text-xl break-words ${text === plainText ? '' : 'leading-12'}`}>{text('message.sender', message.sender)}</strong>
        <span className="text-lg">Messenger</span>
      </header>
      <div className="flex min-h-48 flex-col gap-3 bg-white p-4 sm:p-5">
        {message.bubbles.map((bubble, i) => (
          <p key={i} className={`w-fit max-w-[90%] rounded-3xl bg-[#f0f0f0] px-4 py-2 break-words whitespace-pre-wrap ${lines(text)}`}>
            {text(`message.bubble.${i}`, bubble)}
          </p>
        ))}
      </div>
    </article>
  )
}

// Line breaks after slashes only where possible: a domain split in two looks wrong even when it's real.
export function BreakableUrl({ url }: { url: string }) {
  return url.split(/(?<=\/)/).map((part, i) => (
    <span key={i}>
      {part}
      <wbr />
    </span>
  ))
}

export function LinkView({ link, text = plainText }: { link: PlayableLink; text?: RenderText }) {
  return (
    <article className="on-paper rounded-2xl bg-paper p-5 text-ink sm:p-7">
      {link.context && <p className="mb-3">{link.context}</p>}
      <p className={`rounded-xl border-2 border-mist bg-[#f2f2f7] p-4 font-mono text-xl [overflow-wrap:anywhere] sm:text-2xl ${lines(text)}`}>
        {text === plainText ? <BreakableUrl url={link.url} /> : text('link.url', link.url)}
      </p>
    </article>
  )
}
