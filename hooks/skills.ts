/**
 * Finds a skill's SKILL.md and reads the two frontmatter keys the router uses,
 * without the `skill.prompt` event: a managed plugin may send that event past
 * user mods, while `tool.call` and `prompt.submit` still reach them.
 */

export type SkillFront = { effort?: string; model?: string }

const join = (...parts: string[]): string =>
  parts
    .map((part, index) => (index === 0 ? part.replace(/[\\/]+$/, '') : part.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('/')

/**
 * Where a skill named `raw` may live, most specific first: the project's
 * `.claude/skills`, then the user's. A plugin skill (`plugin:name`) is looked
 * up under its own name too, since plugins may also install a user copy.
 */
export const skillFiles = (raw: string, cwd: string | undefined, configDir: string | undefined): string[] => {
  const name = raw.replace(/^\//, '').split(':').pop()?.trim() ?? ''
  if (name === '' || /[\\/]|\.\./.test(name)) return []
  const roots = [cwd && join(cwd, '.claude'), configDir].filter((root): root is string => Boolean(root))
  return roots.map(root => join(root, 'skills', name, 'SKILL.md'))
}

const unquote = (value: string): string => value.trim().replace(/^(['"])(.*)\1$/, '$2').trim()

/** The `effort:` and `model:` scalars of a file's YAML frontmatter. */
export const frontmatterOf = (text: string): SkillFront => {
  const match = /^﻿?---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)
  if (!match) return {}
  const front: SkillFront = {}
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const pair = /^(effort|model):[ \t]*(.*)$/.exec(line)
    if (!pair) continue
    const value = unquote((pair[2] ?? '').replace(/\s+#.*$/, ''))
    if (value !== '') front[pair[1] as keyof SkillFront] = value
  }
  return front
}
