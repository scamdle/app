import { FORMAT_MEDIA, FORMATS, MEDIA, type Format, type Medium } from './options'
import { textSegments } from './segments'

export type ExerciseProblem = { path: string; message: string }

type Row = Record<string, unknown>

const filled = (value: unknown) => (typeof value === 'string' ? value.trim() !== '' : value != null)
const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : [])
const labelOf = (list: readonly { label: string; value: string }[], value: unknown) =>
  list.find((item) => item.value === value)?.label ?? String(value)

export function isVideoUrl(value: unknown): boolean {
  try {
    return new URL(String(value)).protocol === 'https:'
  } catch {
    return false
  }
}

// Drafts may be unfinished; this runs when an exercise is set to Published,
// so a broken exercise can never reach a player.
export function exerciseProblems(data: Row): ExerciseProblem[] {
  const problems: ExerciseProblem[] = []
  const need = (path: string, value: unknown, message: string) => {
    if (!filled(value)) problems.push({ path, message })
  }
  const group = (name: string) => (data[name] ?? {}) as Row
  const format = data.format as Format
  const medium = data.medium as Medium

  need('description', data.description, 'Describe the situation for the player.')

  if (!FORMAT_MEDIA[format]?.includes(medium)) {
    problems.push({
      path: 'medium',
      message: `${labelOf(FORMATS, format)} can't use ${labelOf(MEDIA, medium)}.`,
    })
    return problems
  }

  if (format !== 'side-by-side') {
    if (medium === 'email') {
      for (const [field, label] of [
        ['fromName', 'sender name'],
        ['fromAddress', 'sender address'],
        ['subject', 'subject'],
        ['body', 'body'],
      ]) {
        need(`email.${field}`, group('email')[field], `Add the email's ${label}.`)
      }
    }
    if (medium === 'message') {
      need('message.platform', group('message').platform, 'Choose the app.')
      need('message.sender', group('message').sender, 'Add the sender.')
      const bubbles = rows(group('message').bubbles)
      if (!bubbles.some((b) => filled(b.text))) problems.push({ path: 'message.bubbles', message: 'Add at least one message.' })
      if (format === 'what-next' && group('message').platform !== 'sms') {
        problems.push({ path: 'message.platform', message: 'What would you do next? only uses SMS.' })
      }
    }
    if (medium === 'link') need('link.url', group('link').url, 'Add the link.')
    if (medium === 'image') need('image', data.image, 'Upload the image.')
    if (medium === 'video') {
      if (!isVideoUrl(data.videoUrl)) problems.push({ path: 'videoUrl', message: 'Paste a video link starting with https://.' })
    }
  }

  if (format === 'spot-red-flags' && medium === 'image') {
    const dots = rows(data.dots)
    if (dots.length === 0) problems.push({ path: 'dots', message: 'Place at least one dot on the image.' })
    if (dots.some((dot) => !filled(dot.reason))) problems.push({ path: 'dots', message: 'Every dot needs a reason.' })
  }

  if (format === 'spot-red-flags' && medium !== 'image') {
    const flags = rows(data.flags)
    if (flags.length === 0) problems.push({ path: 'flags', message: 'Add at least one red flag.' })
    const text = Object.values(textSegments(data))
    flags.forEach((flag, i) => {
      need(`flags.${i}.reason`, flag.reason, 'Explain why this is suspicious.')
      if (filled(flag.text) && !text.some((t) => t.includes(String(flag.text)))) {
        problems.push({ path: `flags.${i}.text`, message: `"${String(flag.text)}" doesn't appear in the message. Copy it exactly.` })
      }
    })
  }

  if (format === 'real-or-fake') {
    need('verdict', data.verdict, 'Choose whether this is real or fake.')
    need('answerReason', data.answerReason, 'Explain the answer.')
  }

  if (format === 'side-by-side') {
    const comparison = group('comparison')
    if (medium === 'image') {
      need('comparison.realImage', comparison.realImage, 'Upload the real image.')
      need('comparison.fakeImage', comparison.fakeImage, 'Upload the fake image.')
    } else {
      if (!isVideoUrl(comparison.realVideoUrl)) problems.push({ path: 'comparison.realVideoUrl', message: 'Paste a link starting with https://.' })
      if (!isVideoUrl(comparison.fakeVideoUrl)) problems.push({ path: 'comparison.fakeVideoUrl', message: 'Paste a link starting with https://.' })
    }
    need('answerReason', data.answerReason, 'Explain how to tell them apart.')
  }

  if (format === 'what-next') {
    need('scenario', data.scenario, 'Describe the scenario.')
    const options = rows(data.options)
    if (options.length < 2) problems.push({ path: 'options', message: 'Add at least two options.' })
    if (!options.some((option) => option.isCorrect === true)) problems.push({ path: 'options', message: 'Mark at least one option as correct.' })
    options.forEach((option, i) => {
      need(`options.${i}.text`, option.text, 'Add the option text.')
      need(`options.${i}.explanation`, option.explanation, 'Explain this option.')
    })
  }

  return problems
}
