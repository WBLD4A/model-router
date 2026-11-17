import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Effort, Route } from '../types'
import { asEffort, modelDot, prettyEffort, prettyModel, route, safeTop } from './rules.ts'
import { frontmatterOf, skillFiles } from './skills.ts'

type Skill = { name: string; effort?: Effort; model?: string }

const last = atom({ plugin: 'model-router', key: 'last' } as const, null)
// Model the conversation is locked to once a code modification started.
const locked = atom({ plugin: 'model-router', key: 'locked' } as const, null)

type Options = { mode?: string; topModel?: string }

const isFable = (id: string): boolean => /fable/i.test(id)

export const register: Register = (on, options) => {
  const { mode = 'auto', topModel: wanted = 'opus' } = (options ?? {}) as Options
  const topModel = safeTop(wanted)

  // The current turn's plan; reset by each prompt the person sends.
  let planned: Route | null = null
  let skill: Skill | null = null

  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta) return next(e)

    skill = null
    if (e.command) {
      try {
        skill = await skillOf($, e.command.name)
      } catch {
        // Not a skill, or unreadable: the prompt's route applies.
      }
    }
    if (mode !== 'auto') {
      planned = null
      return next(e)
    }

    const text = e.command ? e.command.args : e.text
    const previous = await read($, last)
    const lockedModel = await read($, locked)
    const next_ = route({
      text,
      hasAttachments: (e.attachments?.length ?? 0) > 0,
      previous,
      topModel,
      locked: lockedModel,
    })
    planned = next_
    await update($, last, () => next_)
    if (next_.lock && !lockedModel) await update($, locked, () => next_.model)

    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : ((planned = null), next(e))))

  // Each skill keeps the effort (and model) its SKILL.md frontmatter imposes.
  // Read from the file on the Skill tool call, since a managed plugin may send
  // `skill.prompt` past user mods.
  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        skill = (await skillOf($, e.skill)) ?? skill
      } catch {
        // Routing just keeps the prompt's plan.
      }
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

/** The skill's own effort and model, from its SKILL.md; null without one. */
const skillOf = async ($: EngineInterface, raw: string): Promise<Skill | null> => {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  const configDir = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? (home && `${home}/.claude`)
  const files = skillFiles(raw, await $.session.cwd(), configDir)
  for (const file of files) {
    if (!(await $.fs.exists(file))) continue
    const front = frontmatterOf(String(await $.fs.read(file)))
    return { name: raw.replace(/^\//, ''), effort: asEffort(front.effort), model: front.model }
  }
  return null
}

/** The desktop footer draws only text, so the family is a colored dot. */
const line = (model: string, effort: string, why: string | undefined): string =>
  [`${modelDot(model)} ${prettyModel(model)}`, effort, why && `(${why})`]
    .filter(Boolean)
    .join(' · ')
