import type { ScenarioMedium } from './options'
import {
  choiceProblems,
  emailProblems,
  flagProblems,
  messageProblems,
  problemList,
  type ExerciseProblem,
  type Row,
} from './validate'

// Runs when a scenario is set to Published, so a broken one can never reach a player.
export function scenarioProblems(data: Row): ExerciseProblem[] {
  const list = problemList()
  const { problems, need } = list
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

  need('verdict', data.verdict, 'Choose whether this is real or fake.')
  need('verdictReason', data.verdictReason, 'Explain why it is real or fake.')
  if (data.verdict === 'fake') flagProblems(data, list)
  if (data.verdict === 'real') choiceProblems('whyReal', data.whyReal, list)

  need('nextPrompt', data.nextPrompt, 'Add the step 3 question.')
  choiceProblems('nextOptions', data.nextOptions, list)

  return problems
}
