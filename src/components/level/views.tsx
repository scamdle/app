import Image from 'next/image'
import type { ReactNode } from 'react'

import type { Platform } from '@/lib/exercises/options'
import type { PlayableEmail, PlayableImage, PlayableLink, PlayableMessage, PlayableVideo } from '@/lib/exercises/types'

// `text` decides how each piece is drawn: plain, or split into tappable words in red-flags levels.
export type RenderText = (segment: string, value: string) => ReactNode

const plainText: RenderText = (_, value) => value

// Tappable words need 48px of height each, so those lines sit further apart.
const lines = (text: RenderText) => (text === plainText ? 'leading-loose' : 'leading-12')

export function EmailView({ email, text = plainText }: { email: PlayableEmail; text?: RenderText }) {
  return (
    <article className="on-paper rounded-2xl bg-paper p-5 text-ink sm:p-7">
      <h2 className={`text-2xl font-bold ${text === plainText ? 'leading-snug' : 'leading-12'}`}>{text('email.subject', email.subject)}</h2>
      <p className={`mt-3 border-b-2 border-mist pb-3 break-words ${text === plainText ? '' : 'leading-12'}`}>
        <strong>{text('email.fromName', email.fromName)}</strong>{' '}
        <span className="whitespace-nowrap">&lt;</span>
        {text('email.fromAddress', email.fromAddress)}
        <span>&gt;</span>
      </p>
      <div className={`mt-4 break-words whitespace-pre-wrap ${lines(text)}`}>{text('email.body', email.body)}</div>
    </article>
  )
}

// Familiar colours and layout for each app, without logos or exact copies.
const CHATS: Record<Platform, { name: string; head: string; wall: string; bubble: string }> = {
  sms: { name: 'Text message', head: 'bg-[#f2f2f7] text-ink border-b border-mist', wall: 'bg-white', bubble: 'bg-[#e9e9eb] rounded-2xl' },
  whatsapp: { name: 'WhatsApp', head: 'bg-[#075e54] text-white', wall: 'bg-[#ece5dd]', bubble: 'bg-white rounded-lg rounded-tl-none shadow-sm' },
  messenger: { name: 'Messenger', head: 'bg-white text-ink border-b border-mist', wall: 'bg-white', bubble: 'bg-[#f0f0f0] rounded-3xl' },
}

export function ChatView({ message, text = plainText }: { message: PlayableMessage; text?: RenderText }) {
  const chat = CHATS[message.platform]
  return (
    <article className="on-paper overflow-hidden rounded-2xl text-ink">
      <header className={`px-5 py-3 ${chat.head}`}>
        <strong className={`block text-xl break-words ${text === plainText ? '' : 'leading-12'}`}>{text('message.sender', message.sender)}</strong>
        <span className="text-lg">{chat.name}</span>
      </header>
      <div className={`flex min-h-48 flex-col gap-3 p-4 sm:p-5 ${chat.wall}`}>
        {message.bubbles.map((bubble, i) => (
          <p key={i} className={`w-fit max-w-[90%] px-4 py-2 break-words whitespace-pre-wrap ${lines(text)} ${chat.bubble}`}>
            {text(`message.bubble.${i}`, bubble)}
          </p>
        ))}
      </div>
    </article>
  )
}

// Line breaks after slashes only where possible: a domain split in two looks wrong even when it's real.
function BreakableUrl({ url }: { url: string }) {
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

export function PictureView({ image, className = '' }: { image: PlayableImage; className?: string }) {
  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes="(max-width: 1024px) 100vw, 1024px"
      draggable={false}
      className={`block h-auto w-full select-none ${className}`}
    />
  )
}

export function VideoView({ video, title }: { video: PlayableVideo; title: string }) {
  if (video.kind === 'embed') {
    return (
      <iframe
        src={video.src}
        title={title}
        allow="fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-2xl bg-black"
      />
    )
  }
  return (
    <video src={video.src} title={title} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />
  )
}
