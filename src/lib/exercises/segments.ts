type TextContent = {
  medium?: string | null
  email?: { fromName?: string | null; fromAddress?: string | null; subject?: string | null; body?: string | null } | null
  message?: { sender?: string | null; bubbles?: { text?: string | null }[] | null } | null
  link?: { url?: string | null } | null
}

// The pieces of text a player can tap, by a stable id. The browser renders them and the
// server checks guesses against them, so both sides must agree on this list.
export function textSegments(exercise: TextContent): Record<string, string> {
  const segments: Record<string, string | null | undefined> = {}
  if (exercise.medium === 'email') {
    segments['email.fromName'] = exercise.email?.fromName
    segments['email.fromAddress'] = exercise.email?.fromAddress
    segments['email.subject'] = exercise.email?.subject
    segments['email.body'] = exercise.email?.body
  }
  if (exercise.medium === 'message') {
    segments['message.sender'] = exercise.message?.sender
    exercise.message?.bubbles?.forEach((bubble, i) => {
      segments[`message.bubble.${i}`] = bubble.text
    })
  }
  if (exercise.medium === 'link') segments['link.url'] = exercise.link?.url
  return Object.fromEntries(Object.entries(segments).filter((e): e is [string, string] => Boolean(e[1])))
}
