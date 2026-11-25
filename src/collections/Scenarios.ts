import { ValidationError, type ArrayField, type CollectionConfig } from 'payload'

import { editorsOnly, emailGroup, explanationField, messageGroup, statusField } from '@/collections/shared/fields'
import { AD_PLATFORMS, SCENARIO_MEDIA, SCENARIO_WANTS } from '@/lib/exercises/options'
import { scenarioProblems } from '@/lib/exercises/scenarioValidate'
import { DEFAULT_REGION, REGIONS } from '@/lib/regions'

type Data = Record<string, unknown>
const usesMedium = (...media: string[]) => (data: Data) => media.includes(data?.medium as string)

const choices = (name: string, condition: (data: Data) => boolean, description: string): ArrayField => ({
  name,
  type: 'array',
  labels: { singular: 'Option', plural: 'Options' },
  admin: { condition, description },
  fields: [
    { name: 'text', type: 'text', required: true },
    { name: 'isCorrect', type: 'checkbox', defaultValue: false, access: editorsOnly },
    { name: 'explanation', type: 'textarea', access: editorsOnly, admin: { description: 'Shown after the player checks.' } },
  ],
})

// Every scenario is a scam, played in steps: what does it want? → its red flags (ads and
// search results: the ad or result, then the page; shops: then the reviews) → what next?
export const Scenarios: CollectionConfig = {
  slug: 'scenarios',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'medium', 'region', 'status'],
    description:
      'Used when Game settings → Mode is "1 scenario in steps". Every scenario is a scam, best based on a real reported one. Pick one per day in Daily sets.',
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
        description: 'The page Anna lands on after clicking. It gets its own step, and its words can be red flags too.',
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

    {
      name: 'check',
      type: 'group',
      label: 'Anna checks the reviews (optional)',
      admin: {
        description:
          'For fake shops whose page looks fine: what Anna finds when she searches for reviews. Drawn as a review site, with its own step. Leave empty to skip.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'query', type: 'text', admin: { description: 'What Anna searched, e.g. nordic shoes outlet reviews' } },
            { name: 'site', type: 'text', admin: { description: 'The shop being reviewed, e.g. nordic-shoes-outlet.shop' } },
          ],
        },
        { name: 'rating', type: 'text', admin: { description: 'Starts with the score, e.g. "1.4 out of 5 from 212 reviews". The stars are drawn from the first number.' } },
        {
          name: 'reviews',
          type: 'array',
          labels: { singular: 'Review', plural: 'Reviews' },
          fields: [{ name: 'text', type: 'textarea', required: true }],
        },
      ],
    },

    // Step 1
    {
      name: 'wants',
      type: 'select',
      hasMany: true,
      access: editorsOnly,
      options: [...SCENARIO_WANTS],
      admin: { description: 'Step 1: "What is this trying to get Anna to do?" Pick every answer that is visible on the first screen.' },
    },
    {
      name: 'wantsExplanation',
      type: 'textarea',
      access: editorsOnly,
      admin: { description: 'Shown under the right answers in step 1, e.g. "Shop now" leads to a payment page.' },
    },

    // Red flags
    {
      name: 'flags',
      type: 'array',
      access: editorsOnly,
      labels: { singular: 'Red flag', plural: 'Red flags' },
      admin: {
        description:
          'Copy the exact text, then explain why it is suspicious. Each flag is asked in every step where its text appears: the message, ad or result, the landing page, the reviews.',
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
      admin: { description: 'How many wrong taps end a red-flag step. Correct taps are free.' },
    },

    // Last step
    {
      name: 'nextPrompt',
      type: 'text',
      defaultValue: 'What should Anna do next?',
      admin: { description: 'The last step\'s question, e.g. "How can Anna check this shop is real before paying?"' },
    },
    choices('nextOptions', () => true, 'Last step options. Tick every option that is correct.'),

    {
      name: 'verdictReason',
      label: 'Why it is a scam',
      type: 'textarea',
      access: editorsOnly,
      admin: { description: 'Shown on the summary at the end.' },
    },
    explanationField('Optional lesson or what happened next, shown on the summary, e.g. what Anna found when she checked.'),
    {
      name: 'basedOn',
      type: 'text',
      access: editorsOnly,
      admin: { description: 'Optional: link to the real warning this is based on (police, CERT-EE, a bank). Editors only.' },
    },
    statusField,
  ],
}
