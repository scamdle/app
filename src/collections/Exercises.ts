import { ValidationError, type CollectionConfig } from 'payload'

import { editorsOnly, emailGroup, explanationField, messageGroup, statusField } from '@/collections/shared/fields'
import { FORMAT_MEDIA, FORMATS, MEDIA, type Format } from '@/lib/exercises/options'
import { exerciseProblems } from '@/lib/exercises/validate'
import { DEFAULT_REGION, REGIONS } from '@/lib/regions'

const isText = (data: Record<string, unknown>) => data?.format === 'spot-red-flags'
const usesMedium = (medium: string) => (data: Record<string, unknown>) => data?.medium === medium
const isFormat = (...formats: Format[]) => (data: Record<string, unknown>) =>
  formats.includes(data?.format as Format)

export const Exercises: CollectionConfig = {
  slug: 'exercises',
  labels: { singular: 'Exercise (3-task mode)', plural: 'Exercises (3-task mode)' },
  admin: {
    description: 'Used when Game settings → Mode is "3 separate tasks". Scenario mode uses Scenarios instead.',
    useAsTitle: 'title',
    defaultColumns: ['title', 'format', 'medium', 'region', 'status'],
  },
  access: {
    // Logged-in team members see everything; the public only sees published exercises.
    read: ({ req: { user } }) => (user ? true : { status: { equals: 'published' } }),
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        const merged = { ...originalDoc, ...data }
        if (merged.status === 'published') {
          const errors = exerciseProblems(merged)
          if (errors.length > 0) throw new ValidationError({ collection: 'exercises', errors })
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Shown to the player before the level starts.' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'The situation, e.g. "Anna got this email this morning." How to play is added automatically.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'format', type: 'select', required: true, options: [...FORMATS] },
        {
          name: 'medium',
          type: 'select',
          required: true,
          options: [...MEDIA],
          filterOptions: ({ data, options }) => {
            const allowed = FORMAT_MEDIA[data?.format as Format]
            return allowed ? options.filter((o) => allowed.includes((typeof o === 'string' ? o : o.value) as never)) : options
          },
        },
        {
          name: 'region',
          type: 'select',
          required: true,
          defaultValue: DEFAULT_REGION,
          options: [...REGIONS],
          admin: { description: 'Which players get this exercise.' },
        },
      ],
    },

    // What the player looks at
    emailGroup(usesMedium('email')),
    messageGroup(usesMedium('message'), (data) => data?.format === 'what-next'),
    {
      name: 'link',
      type: 'group',
      admin: { condition: usesMedium('link') },
      fields: [
        { name: 'context', type: 'text', admin: { description: 'Where the link was seen, e.g. "In a text from Lumo Bank".' } },
        { name: 'url', type: 'text', admin: { description: 'The link exactly as it appears. Players only read it; it never opens.' } },
      ],
    },

    // The answers
    {
      name: 'flags',
      type: 'array',
      access: editorsOnly,
      labels: { singular: 'Red flag', plural: 'Red flags' },
      admin: {
        condition: isText,
        description: 'Copy the exact text from the message above, then explain why it is suspicious.',
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
      admin: { condition: isText, description: 'How many wrong taps end the level. Correct taps are free.' },
    },
    {
      name: 'verdict',
      type: 'radio',
      access: editorsOnly,
      options: [
        { label: 'Real', value: 'real' },
        { label: 'Fake', value: 'fake' },
      ],
      admin: { condition: isFormat('real-or-fake') },
    },
    {
      name: 'answerReason',
      type: 'textarea',
      access: editorsOnly,
      admin: { condition: isFormat('real-or-fake'), description: 'Shown after the player answers.' },
    },
    {
      name: 'scenario',
      type: 'textarea',
      admin: { condition: isFormat('what-next'), description: 'Shown next to the message, e.g. "What should Anna do?"' },
    },
    {
      name: 'options',
      type: 'array',
      labels: { singular: 'Option', plural: 'Options' },
      admin: { condition: isFormat('what-next'), description: 'Tick every option that is correct. Players choose all the right ones.' },
      fields: [
        { name: 'text', type: 'text', required: true },
        { name: 'isCorrect', type: 'checkbox', defaultValue: false, access: editorsOnly },
        { name: 'explanation', type: 'textarea', access: editorsOnly },
      ],
    },
    explanationField(),
    statusField,
  ],
}
