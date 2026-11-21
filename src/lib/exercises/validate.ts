import { FORMAT_MEDIA, FORMATS, MEDIA, type Format, type Medium } from './options'
import { textSegments } from './segments'

export type ExerciseProblem = { path: string; message: string }

export type Row = Record<string, unknown>

export const filled = (value: unknown) => (typeof value === 'string' ? value.trim() !== '' : value != null)
export const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : [])
const labelOf = (list: readonly { label: string; value: string }[], value: unknown) =>
  list.find((item) => item.value === value)?.label ?? String(value)

// Collects problems; shared by the exercise and scenario publish checks.
export function problemList() {
  const problems: ExerciseProblem[] = []
  const need = (path: string, value: unknown, message: string) => {
    if (!filled(value)) problems.push({ path, message })
  }
  const add = (path: string, message: string) => problems.push({ path, message })
  return { problems, need, add }
}

export function emailProblems(email: Row, need: ReturnType<typeof problemList>['need']) {
  for (const [field, label] of [
    ['fromName', 'sender name'],
    ['fromAddress', 'sender address'],
    ['subject', 'subject'],
    ['body', 'body'],
  ]) {
    need(`email.${field}`, email[field], `Add the email's ${label}.`)
  }
}

export function messageProblems(message: Row, { need, add }: Pick<ReturnType<typeof problemList>, 'need' | 'add'>) {
  need('message.platform', message.platform, 'Choose the app.')
  need('message.sender', message.sender, 'Add the sender.')
  if (!rows(message.bubbles).some((b) => filled(b.text))) add('message.bubbles', 'Add at least one message.')
}

// Every red flag must be copied exactly from text the player can tap.
export function flagProblems(data: Row, { need, add }: Pick<ReturnType<typeof problemList>, 'need' | 'add'>) {
  const flags = rows(data.flags)
  if (flags.length === 0) add('flags', 'Add at least one red flag.')
  const text = Object.values(textSegments(data))
  flags.forEach((flag, i) => {
    need(`flags.${i}.reason`, flag.reason, 'Explain why this is suspicious.')
    if (filled(flag.text) && !text.some((t) => t.includes(String(flag.text)))) {
      add(`flags.${i}.text`, `"${String(flag.text)}" doesn't appear in the message. Copy it exactly.`)
    }
  })
}

// Multiple choice where players tick every right answer.
export function choiceProblems(path: string, value: unknown, { need, add }: Pick<ReturnType<typeof problemList>, 'need' | 'add'>) {
  const options = rows(value)
  if (options.length < 2) add(path, 'Add at least two options.')
  if (!options.some((option) => option.isCorrect === true)) add(path, 'Mark at least one option as correct.')
  options.forEach((option, i) => {
    need(`${path}.${i}.text`, option.text, 'Add the option text.')
    need(`${path}.${i}.explanation`, option.explanation, 'Explain this option.')
  })
}

// Drafts may be unfinished; this runs when an exercise is set to Published,
// so a broken exercise can never reach a player.
export function exerciseProblems(data: Row): ExerciseProblem[] {
  const list = problemList()
  const { problems, need, add } = list
  const group = (name: string) => (data[name] ?? {}) as Row
  const format = data.format as Format
  const medium = data.medium as Medium

  need('description', data.description, 'Describe the situation for the player.')

  if (!FORMAT_MEDIA[format]?.includes(medium)) {
    add('medium', `${labelOf(FORMATS, format)} can't use ${labelOf(MEDIA, medium)}.`)
    return problems
  }

  if (medium === 'email') emailProblems(group('email'), need)
  if (medium === 'message') {
    messageProblems(group('message'), list)
    if (format === 'what-next' && group('message').platform !== 'sms') {
      add('message.platform', 'What would you do next? only uses SMS.')
    }
  }
  if (medium === 'link') need('link.url', group('link').url, 'Add the link.')

  if (format === 'spot-red-flags') flagProblems(data, list)

  if (format === 'real-or-fake') {
    need('verdict', data.verdict, 'Choose whether this is real or fake.')
    need('answerReason', data.answerReason, 'Explain the answer.')
  }

  if (format === 'what-next') {
    need('scenario', data.scenario, 'Describe the scenario.')
    choiceProblems('options', data.options, list)
  }

  return problems
}
