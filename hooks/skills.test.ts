import { expect, test } from 'claude-code/testing'

import { frontmatterOf, skillFiles } from './skills.ts'

test('a skill is looked up in the project, then the user folder', () => {
  expect(skillFiles('review', 'C:\\repo\\', 'C:/Users/me/.claude')).toEqual([
    'C:\\repo/.claude/skills/review/SKILL.md',
    'C:/Users/me/.claude/skills/review/SKILL.md',
  ])
})

test('a plugin skill or slash form uses its bare name', () => {
  expect(skillFiles('/tools:review', undefined, '/home/me/.claude')).toEqual([
    '/home/me/.claude/skills/review/SKILL.md',
  ])
})

test('a name that leaves the skills folder finds nothing', () => {
  expect(skillFiles('../etc', '/repo', '/home/me/.claude')).toEqual([])
  expect(skillFiles('', '/repo', '/home/me/.claude')).toEqual([])
})

test('the frontmatter gives effort and model', () => {
  const text = '---\r\nname: review\r\neffort: "high"  # strict\r\nmodel: opus\r\n---\r\nBody effort: low\r\n'
  expect(frontmatterOf(text)).toEqual({ effort: 'high', model: 'opus' })
})

test('a file without frontmatter or keys gives nothing', () => {
  expect(frontmatterOf('effort: high\n')).toEqual({})
  expect(frontmatterOf('---\nname: x\n---\n')).toEqual({})
})
