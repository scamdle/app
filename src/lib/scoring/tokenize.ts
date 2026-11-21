export type Token = {
  text: string
  start: number
  end: number
  // Position among the tappable pieces; null for the spaces and line breaks between them.
  index: number | null
}

// Web and email addresses are their own piece, even inside a sentence: spotting the
// fake domain is a core lesson, so it's worth being precise there.
const ADDRESS =
  /(?:https?:\/\/|www\.)\S+|[^\s@]+@[^\s@]+\.[a-z]{2,}|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b(?:\/\S*)?/gi

// Punctuation right after an address belongs to the sentence, not the address.
const TRAILING = /[.,!?;:)\]'"’”]+$/

// A sentence ends at . ! or ? followed by a space or the end, or at a line break.
// Dots inside numbers like 1.99 don't end anything.
const SENTENCE_END = /[.!?]+(?=\s|$)|\n/g

type Piece = { start: number; end: number }

function sentences(text: string, offset: number): Piece[] {
  const pieces: Piece[] = []
  let cursor = 0
  const push = (from: number, to: number) => {
    const slice = text.slice(from, to)
    const lead = slice.length - slice.trimStart().length
    const trail = slice.length - slice.trimEnd().length
    if (from + lead < to - trail) pieces.push({ start: offset + from + lead, end: offset + to - trail })
  }
  for (const match of text.matchAll(SENTENCE_END)) {
    const end = match[0] === '\n' ? match.index : match.index + match[0].length
    push(cursor, end)
    cursor = match.index + match[0].length
  }
  push(cursor, text.length)
  return pieces
}

// Splits text into tappable pieces: whole sentences, plus addresses on their own.
// Big targets are easier for older players than single words.
export function tokenize(text: string): Token[] {
  const pieces: Piece[] = []
  let cursor = 0
  for (const match of text.matchAll(ADDRESS)) {
    const address = match[0].replace(TRAILING, '')
    if (!address) continue
    pieces.push(...sentences(text.slice(cursor, match.index), cursor))
    pieces.push({ start: match.index, end: match.index + address.length })
    cursor = match.index + address.length
  }
  pieces.push(...sentences(text.slice(cursor), cursor))

  // A piece without letters or numbers, like the "." after an address, isn't worth a tap.
  const tokens: Token[] = []
  let at = 0
  let index = 0
  for (const piece of pieces) {
    const slice = text.slice(piece.start, piece.end)
    if (!/[\p{L}\p{N}]/u.test(slice)) continue
    if (piece.start > at) tokens.push({ text: text.slice(at, piece.start), start: at, end: piece.start, index: null })
    tokens.push({ text: slice, start: piece.start, end: piece.end, index: index++ })
    at = piece.end
  }
  if (at < text.length) tokens.push({ text: text.slice(at), start: at, end: text.length, index: null })
  return tokens
}
