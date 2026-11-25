// Scenario mode scores each step from 0 to 1 and the whole scenario from 0 to 100%.

// A wrong tap costs a tenth of the step, so guessing every word doesn't pay.
export const WRONG_TAP_COST = 0.1

const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function flagPoints(found: number, total: number, wrong: number): number {
  if (total <= 0) return 0
  return clamp(found / total - WRONG_TAP_COST * wrong)
}

// Tick-every-right-answer: right ticks minus wrong ticks, out of the number of right answers.
export function choicePoints(correct: boolean[], ticked: number[]): number {
  const total = correct.filter(Boolean).length
  if (total === 0) return 0
  const picked = new Set(ticked.filter((i) => Number.isInteger(i) && i >= 0 && i < correct.length))
  let right = 0
  let wrong = 0
  for (const i of picked) {
    if (correct[i]) right++
    else wrong++
  }
  return clamp((right - wrong) / total)
}

// Every step is worth the same (a third, or a quarter for ads and search results), so a
// perfect run is exactly 100.
export function scenarioPercent(steps: number[]): number {
  if (steps.length === 0) return 0
  const sum = steps.reduce((total, points) => total + clamp(points), 0)
  return Math.round((100 * sum) / steps.length)
}

