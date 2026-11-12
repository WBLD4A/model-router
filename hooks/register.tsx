import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Effort, Route } from '../types'
import { asEffort, modelDot, prettyEffort, prettyModel, route, safeTop } from './rules.ts'

const last = atom({ plugin: 'model-router', key: 'last' } as const, null)

type Options = { mode?: string; topModel?: string }

const isFable = (id: string): boolean => /fable/i.test(id)

export const register: Register = (on, options) => {
  const { mode = 'auto', topModel: wanted = 'opus' } = (options ?? {}) as Options
  const topModel = safeTop(wanted)

  // The current turn's plan; reset by each prompt the person sends.
  let planned: Route | null = null
  let skill: { name: string; effort?: Effort; model?: string } | null = null

  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta) return next(e)

    skill = null
    if (mode !== 'auto') {
      planned = null
      return next(e)
    }

    const text = e.command ? e.command.args : e.text
    const previous = await read($, last)
    planned = route({
      text,
      hasAttachments: (e.attachments?.length ?? 0) > 0,
      previous,
      topModel,
    })
    await update($, last, () => planned)

    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : ((planned = null), next(e))))

  // Each skill keeps the effort (and model) its SKILL.md frontmatter imposes.
  on('skill.prompt', ($, e, next) => {
    skill = {
      name: e.skill,
      effort: asEffort(e.frontmatter.effort),
      model: typeof e.frontmatter.model === 'string' ? e.frontmatter.model : undefined,
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    // Subagents keep the model their spawn asked for.
    if (e.agentId !== undefined) return yield* next(e)

    // A session the person put on Fable stays there: routing never touches it.
    const model = isFable(e.model) ? e.model : (skill?.model ?? planned?.model ?? e.model)
    const effort =
      e.effort === undefined ? undefined : (skill?.effort ?? planned?.effort ?? e.effort)

    const result = yield* next(
      effort === undefined ? { ...e, model } : { ...e, model, effort },
    )

    const answered = result.usage?.model ?? model
    const why = skill?.effort ? `skill ${skill.name}` : planned?.reason
    // Short on purpose: the footer cuts long text, and the effort comes first.
    $.ui.status(line(answered, prettyEffort(effort ?? e.effort), undefined))
    void why

    return result
  })

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    $.ui.status(line(await $.session.model(), '', undefined))
    return result
  })
}

/** The desktop footer draws only text, so the family is a colored dot. */
const line = (model: string, effort: string, why: string | undefined): string =>
  [`${modelDot(model)} ${prettyModel(model)}`, effort, why && `(${why})`]
    .filter(Boolean)
    .join(' · ')
