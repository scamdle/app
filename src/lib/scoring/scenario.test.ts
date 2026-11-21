import { describe, expect, it } from 'vitest'

import { choicePoints, flagPoints, scenarioPercent, verdictPoints } from './scenario'

describe('scenario scoring', () => {
  it('scores the verdict as all or nothing', () => {
    expect(verdictPoints(true)).toBe(1)
    expect(verdictPoints(false)).toBe(0)
  })

  it('scores flags proportionally with a small cost per wrong tap', () => {
    expect(flagPoints(3, 3, 0)).toBe(1)
    expect(flagPoints(2, 3, 0)).toBeCloseTo(2 / 3)
    expect(flagPoints(2, 4, 1)).toBeCloseTo(0.4)
    expect(flagPoints(0, 3, 5)).toBe(0)
    expect(flagPoints(1, 0, 0)).toBe(0)
  })

  it('scores choices as right ticks minus wrong ticks, never below zero', () => {
    const correct = [true, false, true, false]
    expect(choicePoints(correct, [0, 2])).toBe(1)
    expect(choicePoints(correct, [0])).toBe(0.5)
    expect(choicePoints(correct, [0, 1])).toBe(0)
    expect(choicePoints(correct, [1, 3])).toBe(0)
    expect(choicePoints(correct, [0, 0, 2, 9, -1])).toBe(1)
  })

  it('makes a perfect run exactly 100%', () => {
    expect(scenarioPercent([1, 1, 1])).toBe(100)
    expect(scenarioPercent([0, 0, 0])).toBe(0)
    expect(scenarioPercent([1, 0.5, 0])).toBe(50)
    expect(scenarioPercent([1, 1, 0])).toBe(67)
  })
})
