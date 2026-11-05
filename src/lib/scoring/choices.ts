import type { Stars } from './types'

// "What would you do next?": a mistake is a correct option left unticked or a wrong one ticked.
export function optionStars(correct: boolean[], ticked: number[]): Stars {
  const tickedSet = new Set(ticked.filter((i) => i >= 0 && i < correct.length))
  let correctTicks = 0
  let mistakes = 0
  correct.forEach((isCorrect, i) => {
    if (isCorrect && tickedSet.has(i)) correctTicks++
    if (isCorrect !== tickedSet.has(i)) mistakes++
  })
  if (correctTicks === 0) return 0
  if (mistakes === 0) return 3
  return mistakes === 1 ? 2 : 1
}

// Real or fake and side by side are one call: right or wrong.
export function verdictStars(correct: boolean): Stars {
  return correct ? 3 : 0
}
