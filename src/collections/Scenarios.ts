import { ValidationError, type ArrayField, type CollectionConfig } from 'payload'

import { editorsOnly, emailGroup, explanationField, messageGroup, statusField } from '@/collections/shared/fields'
import { AD_PLATFORMS, SCENARIO_MEDIA } from '@/lib/exercises/options'
import { scenarioProblems } from '@/lib/exercises/scenarioValidate'
import { DEFAULT_REGION, REGIONS } from '@/lib/regions'

type Data = Record<string, unknown>
const usesMedium = (...media: string[]) => (data: Data) => media.includes(data?.medium as string)
const isVerdict = (verdict: 'real' | 'fake') => (data: Data) => data?.verdict === verdict

// `hidden` hides the whole list from the public API, not just the answers: only real
// scenarios have "why is it real?" options, so even their texts would give the verdict away.
const choices = (name: string, condition: (data: Data) => boolean, description: string, hidden = false): ArrayField => ({
  name,
  type: 'array',
  ...(hidden ? { access: editorsOnly } : {}),
  labels: { singular: 'Option', plural: 'Options' },
  admin: { condition, description },
  fields: [
    { name: 'text', type: 'text', required: true },
    { name: 'isCorrect', type: 'checkbox', defaultValue: false, access: editorsOnly },
    { name: 'explanation', type: 'textarea', access: editorsOnly, admin: { description: 'Shown after the player checks.' } },
  ],
})

// One message played in steps: real or fake? → back it up (ads and search results:
// the ad or result, then the page) → what next?
export const Scenarios: CollectionConfig = {
  slug: 'scenarios',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'medium', 'verdict', 'region', 'status'],
    description: 'Used when Game settings → Mode is "1 scenario in 3 steps". Pick one per day in Daily sets.',
  },
  access: {
    read: ({ req: { user } }) => (user ? true : { status: { equals: 'published' } }),
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        const merged = { ...originalDoc, ...data }
        if (merged.status === 'published') {
          const errors = scenarioProblems(merged)
          if (errors.length > 0) throw new ValidationError({ collection: 'scenarios', errors })
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'Shown to the player before the scenario starts.' } },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'The situation, e.g. "Anna was scrolling Facebook and saw this ad." How to play is added automatically.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'medium', type: 'select', required: true, options: [...SCENARIO_MEDIA] },
        { name: 'region', type: 'select', required: true, defaultValue: DEFAULT_REGION, options: [...REGIONS] },
      ],
    },

    // What the player looks at
    emailGroup(usesMedium('email')),
    messageGroup(usesMedium('message')),
    {
      name: 'ad',
      type: 'group',
      admin: { condition: usesMedium('ad'), description: 'Drawn like a sponsored post in a social media feed. "Sponsored" is added automatically.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'platform', type: 'select', options: [...AD_PLATFORMS], defaultValue: 'facebook' },
            { name: 'pageName', type: 'text', admin: { description: 'The page that posted the ad.' } },
          ],
        },
        { name: 'text', type: 'textarea', admin: { description: 'The post text above the picture area.' } },
        { name: 'headline', type: 'text', admin: { description: 'The bold line under the picture area, e.g. "-80% today only".' } },
        {
          type: 'row',
          fields: [
            { name: 'displayUrl', type: 'text', admin: { description: 'The address shown on the ad, e.g. SHOP-DEALS.NET' } },
            { name: 'buttonText', type: 'text', admin: { description: 'e.g. Shop now' } },
          ],
        },
      ],
    },
    {
      name: 'search',
      type: 'group',
      admin: { condition: usesMedium('search'), description: 'Drawn like one result on a search page.' },
      fields: [
        { name: 'query', type: 'text', admin: { description: 'What Anna typed into the search box.' } },
        { name: 'sponsored', type: 'checkbox', defaultValue: true, admin: { description: 'Shows the "Sponsored" label above the result.' } },
        { name: 'title', type: 'text' },
        { name: 'displayUrl', type: 'text', admin: { description: 'The address shown above the title.' } },
        { name: 'snippet', type: 'textarea', admin: { description: 'The short text under the title.' } },
      ],
    },
    {
      name: 'landing',
      type: 'group',
      label: 'Landing page',
      admin: {
        condition: usesMedium('ad', 'search'),
        description: 'The page Anna lands on after clicking. Shown from step 2, and its words can be red flags too.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'url', type: 'text', admin: { description: 'Shown in the address bar.' } },
            { name: 'siteName', type: 'text' },
          ],
        },
        { name: 'headline', type: 'text' },
        { name: 'body', type: 'textarea', admin: { description: 'Each line becomes its own line on the page, e.g. prices, "Only 2 left!".' } },
        { name: 'buttonText', type: 'text', admin: { description: 'e.g. Pay now' } },
      ],
    },

    // Step 1
    {
      name: 'verdict',
      type: 'radio',
      access: editorsOnly,
      options: [
        { label: 'Real', value: 'real' },
        { label: 'Fake', value: 'fake' },
      ],
      admin: { description: 'Step 1: players guess this. If they get it wrong they only hear the answer, not why.' },
    },
    {
      name: 'verdictReason',
      type: 'textarea',
      access: editorsOnly,
      admin: { description: 'Why it is real or fake. Shown on the summary at the end.' },
    },

    // Step 2
    {
      name: 'flags',
      type: 'array',
      access: editorsOnly,
      labels: { singular: 'Red flag', plural: 'Red flags' },
      admin: {
        condition: isVerdict('fake'),
        description:
          'For fakes: copy the exact text, then explain why it is suspicious. Ads and search results: flags in the ad or result are asked in step 2, flags on the landing page in step 3.',
      },
      fields: [
        { name: 'text', type: 'text', required: true },
        { name: 'reason', type: 'textarea', required: true },
      ],
    },
    {
      name: 'maxWrongGuesses',
      type: 'number',
      min: 1,
      defaultValue: 3,
      admin: { condition: isVerdict('fake'), description: 'How many wrong taps end a red-flag step. Correct taps are free.' },
    },
    choices('whyReal', isVerdict('real'), 'Step 2 for real ones: "Why is this real?" Tick every option that is a good reason.', true),
    choices(
      'pageWhyReal',
      (data) => isVerdict('real')(data) && usesMedium('ad', 'search')(data),
      'Step 3 for real ads and search results: "Why is this page real?" about the landing page. Leave empty to skip the page step.',
      true,
    ),

    // Step 3
    {
      name: 'nextPrompt',
      type: 'text',
      defaultValue: 'What should Anna do next?',
      admin: { description: 'The last step\'s question, e.g. "How can Anna check this shop is real before paying?"' },
    },
    choices('nextOptions', () => true, 'Last step options. Tick every option that is correct.'),

    explanationField('Optional lesson shown on the summary at the end.'),
    statusField,
  ],
}
