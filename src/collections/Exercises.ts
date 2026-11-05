import { LinkFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { ValidationError, type CollectionConfig, type FieldAccess } from 'payload'

import { FORMAT_MEDIA, FORMATS, MEDIA, PLATFORMS, type Format } from '@/lib/exercises/options'
import { exerciseProblems } from '@/lib/exercises/validate'
import { DEFAULT_REGION, REGIONS } from '@/lib/regions'

// /api/exercises is public, so everything that gives an answer away is for logged-in editors only.
const editorsOnly: { read: FieldAccess } = { read: ({ req: { user } }) => Boolean(user) }

const isText = (data: Record<string, unknown>) =>
  data?.format === 'spot-red-flags' && data?.medium !== 'image'
const usesMedium = (medium: string) => (data: Record<string, unknown>) =>
  data?.medium === medium && data?.format !== 'side-by-side'
const isFormat = (...formats: Format[]) => (data: Record<string, unknown>) =>
  formats.includes(data?.format as Format)

export const Exercises: CollectionConfig = {
  slug: 'exercises',
  admin: {
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
    {
      name: 'email',
      type: 'group',
      admin: { condition: usesMedium('email') },
      fields: [
        { name: 'fromName', type: 'text' },
        { name: 'fromAddress', type: 'text' },
        { name: 'subject', type: 'text' },
        { name: 'body', type: 'textarea' },
      ],
    },
    {
      name: 'message',
      type: 'group',
      admin: { condition: usesMedium('message') },
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [...PLATFORMS],
          filterOptions: ({ data, options }) =>
            data?.format === 'what-next' ? options.filter((o) => (typeof o === 'string' ? o : o.value) === 'sms') : options,
        },
        { name: 'sender', type: 'text', admin: { description: 'The name or number shown at the top of the chat.' } },
        {
          name: 'bubbles',
          type: 'array',
          labels: { singular: 'Message', plural: 'Messages' },
          fields: [{ name: 'text', type: 'textarea', required: true }],
        },
      ],
    },
    {
      name: 'link',
      type: 'group',
      admin: { condition: usesMedium('link') },
      fields: [
        { name: 'context', type: 'text', admin: { description: 'Where the link was seen, e.g. "In a text from Lumo Bank".' } },
        { name: 'url', type: 'text', admin: { description: 'The link exactly as it appears. Players only read it; it never opens.' } },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: usesMedium('image'),
        description: "Text in the picture must be readable on a phone, so use phone-sized screenshots. Give the file a neutral name and alt text: players can see both.",
      },
    },
    {
      name: 'videoUrl',
      type: 'text',
      admin: { condition: usesMedium('video'), description: 'A YouTube or Vimeo link, or a direct link to a video file.' },
    },
    {
      name: 'comparison',
      type: 'group',
      access: editorsOnly,
      admin: {
        condition: isFormat('side-by-side'),
        description: 'The game decides which one appears on which side. Give files neutral names: players can see them.',
      },
      fields: [
        { name: 'realImage', type: 'upload', relationTo: 'media', admin: { condition: (data) => data?.medium === 'image' } },
        { name: 'fakeImage', type: 'upload', relationTo: 'media', admin: { condition: (data) => data?.medium === 'image' } },
        { name: 'realVideoUrl', type: 'text', admin: { condition: (data) => data?.medium === 'video' } },
        { name: 'fakeVideoUrl', type: 'text', admin: { condition: (data) => data?.medium === 'video' } },
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
      name: 'dots',
      type: 'json',
      access: editorsOnly,
      admin: {
        condition: (data) => data?.format === 'spot-red-flags' && data?.medium === 'image',
        components: { Field: '/components/admin/DotPicker#DotPicker' },
      },
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
      admin: { condition: isFormat('real-or-fake', 'side-by-side'), description: 'Shown after the player answers.' },
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
    {
      name: 'explanation',
      type: 'richText',
      access: editorsOnly,
      // This goes to players as-is, and linked or embedded documents would come along in full,
      // answers included. So it only allows plain formatting and external links.
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures.filter((feature) => !['relationship', 'upload', 'link'].includes(feature.key)),
          LinkFeature({ enabledCollections: [] }),
        ],
      }),
      admin: { description: 'Optional lesson shown with the results.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'In review', value: 'in-review' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
