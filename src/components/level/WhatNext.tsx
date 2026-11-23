'use client'

import { answerOptions } from '@/app/(frontend)/level/[id]/actions'
import type { LevelResult, Playable } from '@/lib/exercises/types'

import { ChoiceList } from './ChoiceList'
import { ChatView, EmailView } from './views'

export function WhatNext({ exercise, onFinish }: {
  exercise: Extract<Playable, { format: 'what-next' }>
  onFinish: (result: LevelResult) => void
}) {
  const { content } = exercise

  const submit = async (ticked: number[]) => {
    const response = await answerOptions(exercise.id, ticked)
    // The explanations now open up inside each option, so the results card skips the list.
    onFinish({ ...response.result, items: [] })
    return { correct: response.correct, reasons: response.result.items.map((item) => item.reason) }
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      {content.kind === 'email' ? <EmailView email={content} /> : <ChatView message={content} />}
      <ChoiceList heading={exercise.scenario} options={exercise.options} submit={submit} />
    </div>
  )
}
