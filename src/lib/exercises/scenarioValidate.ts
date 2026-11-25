import type { ScenarioMedium } from './options'
import { flagInPart, hasCheck } from './segments'
import {
  choiceProblems,
  emailProblems,
  flagProblems,
  messageProblems,
  filled,
  problemList,
  rows,
  type ExerciseProblem,
  type Row,
} from './validate'

// Runs when a scenario is set to Published, so a broken one can never reach a player.
export function scenarioProblems(data: Row): ExerciseProblem[] {
  const list = problemList()
  const { problems, need, add } = list
  const group = (name: string) => (data[name] ?? {}) as Row
  const medium = data.medium as ScenarioMedium

  need('description', data.description, 'Describe the situation for the player.')

  if (medium === 'email') emailProblems(group('email'), need)
  if (medium === 'message') messageProblems(group('message'), list)
  if (medium === 'ad') {
    for (const [field, label] of [
      ['pageName', 'page name'],
      ['text', 'post text'],
      ['displayUrl', 'address'],
      ['buttonText', 'button text'],
    ]) {
      need(`ad.${field}`, group('ad')[field], `Add the ad's ${label}.`)
    }
  }
  if (medium === 'search') {
    for (const [field, label] of [
      ['query', 'search words'],
      ['title', 'title'],
      ['displayUrl', 'address'],
      ['snippet', 'snippet'],
    ]) {
      need(`search.${field}`, group('search')[field], `Add the result's ${label}.`)
    }
  }
  if (medium === 'ad' || medium === 'search') {
    need('landing.url', group('landing').url, 'Add the landing page address.')
    need('landing.headline', group('landing').headline, 'Add the landing page headline.')
  }

  const wants = Array.isArray(data.wants) ? data.wants : []
  if (wants.length === 0) add('wants', 'Pick what this scam wants Anna to do.')
  need('wantsExplanation', data.wantsExplanation, 'Explain what on the first screen shows it.')
  need('verdictReason', data.verdictReason, 'Explain why it is a scam.')
  flagProblems(data, list)
  // A filled-in review check gets its own step, so it needs a red flag to find.
  const reviewFlag = rows(data.flags).some((flag) => filled(flag.text) && flagInPart(data, String(flag.text), 'check'))
  if (hasCheck(data) && !reviewFlag) add('check', 'Add a red flag from the reviews, or leave the review check empty.')

  need('nextPrompt', data.nextPrompt, 'Add the "what next" question.')
  choiceProblems('nextOptions', data.nextOptions, list)

  return problems
}
