export type Token = {
  text: string
  start: number
  end: number
  // Position among the tappable tokens; null for the spaces and punctuation between them.
  index: number | null
}

// Letters and numbers form a token, so "lhv-ee.secure-login.com" gives tappable parts
// the same way a sentence gives tappable words.
const WORD = /[\p{L}\p{N}_'’€$£%]+/gu

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let cursor = 0
  let index = 0
  for (const match of text.matchAll(WORD)) {
    const start = match.index
    if (start > cursor) tokens.push({ text: text.slice(cursor, start), start: cursor, end: start, index: null })
    tokens.push({ text: match[0], start, end: start + match[0].length, index: index++ })
    cursor = start + match[0].length
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), start: cursor, end: text.length, index: null })
  return tokens
}
