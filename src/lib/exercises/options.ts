export const FORMATS = [
  { label: 'Spot the red flags', value: 'spot-red-flags' },
  { label: 'Real or fake', value: 'real-or-fake' },
  { label: 'What would you do next?', value: 'what-next' },
] as const

export const MEDIA = [
  { label: 'Email', value: 'email' },
  { label: 'Text message', value: 'message' },
  { label: 'Link', value: 'link' },
] as const

export const PLATFORMS = [
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Messenger', value: 'messenger' },
] as const

export type Format = (typeof FORMATS)[number]['value']
export type Medium = (typeof MEDIA)[number]['value']
export type Platform = (typeof PLATFORMS)[number]['value']

// Which media each format can use. The admin form and the publish check both read this.
export const FORMAT_MEDIA: Record<Format, readonly Medium[]> = {
  'spot-red-flags': ['email', 'message', 'link'],
  'real-or-fake': ['link'],
  'what-next': ['email', 'message'],
}

// Scenario mode
export const SCENARIO_MEDIA = [
  { label: 'Email', value: 'email' },
  { label: 'Text message (SMS, WhatsApp, Messenger)', value: 'message' },
  { label: 'Social media ad', value: 'ad' },
  { label: 'Search result', value: 'search' },
] as const

export const AD_PLATFORMS = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
] as const

// Step 1: what the scam wants Anna to do. The same four answers every day, so players learn
// that every scam ends in one of these.
export const SCENARIO_WANTS = [
  { label: 'Pay or buy something', value: 'pay' },
  { label: 'Log in, or enter her bank or card details', value: 'details' },
  { label: 'Give a code or password', value: 'code' },
  { label: 'Call a number or install something', value: 'call' },
] as const

export type ScenarioWant = (typeof SCENARIO_WANTS)[number]['value']
export type ScenarioMedium = (typeof SCENARIO_MEDIA)[number]['value']
export type AdPlatform = (typeof AD_PLATFORMS)[number]['value']

export const GAME_MODES = [
  { label: '3 separate tasks', value: 'three-tasks' },
  { label: '1 scenario in steps', value: 'scenario' },
] as const

export type GameMode = (typeof GAME_MODES)[number]['value']
