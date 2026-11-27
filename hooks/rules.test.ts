import { expect, test } from 'claude-code/testing'

import { modelDot, prettyModel, route, safeTop } from './rules.ts'

const base = { hasAttachments: false, previous: null, topModel: 'opus' }

test('routes by wording', () => {
  expect(route({ ...base, text: 'où est le fichier routing.json ?' }).model).toBe('haiku')
  expect(route({ ...base, text: 'corrige le test qui échoue dans setup' }).model).toBe('opus')
  expect(route({ ...base, text: 'Concevoir un plugin qui fixe le modèle' }).model).toBe('opus')
  expect(route({ ...base, text: 'vérifie la sécurité du module' }).model).toBe('opus')
  expect(route({ ...base, text: 'liste les skills installés' }).effort).toBe('low')
  expect(route({ ...base, text: 'x'.repeat(2000) }).effort).toBe('high')
})

test('very small changes use sonnet, other edits use opus', () => {
  const small = route({ ...base, text: 'corrige la faute dans le titre du README' })
  expect(small).toMatchObject({ model: 'sonnet', effort: 'low' })
  expect(route({ ...base, text: 'ajoute une option au routeur' }).model).toBe('opus')
})

test('git, CI and PR housekeeping uses sonnet', () => {
  for (const text of [
    'commit et pousse',
    'Merge main and rerun',
    'https://github.com/o/r/pull/12 fixe les conflits',
    'corrige les conflits en attendant',
    'fixe le CI de la PR',
    'resolve current conflicts & allow unverified build',
  ]) {
    expect(route({ ...base, text })).toMatchObject({ model: 'sonnet', effort: 'medium' })
  }
})

test('building something next to a git word stays on opus', () => {
  expect(route({ ...base, text: 'implémente la recherche puis commit et push' }).model).toBe('opus')
  expect(route({ ...base, text: 'corrige le bug de tri et ouvre la PR' }).model).toBe('opus')
})

test('every prompt is routed on its own', () => {
  const previous = { model: 'opus', effort: 'high' as const, reason: 'modification de code' }
  expect(route({ ...base, previous, text: 'commit et pousse' }).model).toBe('sonnet')
  expect(route({ ...base, previous, text: 'où est le fichier routing.json ?' }).model).toBe('haiku')
})

test('a follow-up keeps the previous route', () => {
  const previous = { model: 'opus', effort: 'high' as const, reason: 'conception / analyse' }
  expect(route({ ...base, previous, text: 'oui' }).model).toBe('opus')
  expect(route({ ...base, previous, text: 'Oui, archiver' }).model).toBe('opus')
})

test('a compaction summary keeps the previous route, a brief is not long by itself', () => {
  const summary = `This session is being continued from a previous conversation. ${'x'.repeat(3000)}`
  expect(route({ ...base, text: summary })).toMatchObject({ model: 'sonnet', effort: 'medium' })
  const previous = { model: 'opus', effort: 'high' as const, reason: 'modification de code' }
  expect(route({ ...base, previous, text: summary }).model).toBe('opus')
  const brief = `Background (from the session that started this one):\n${'x '.repeat(1000)}`
  expect(route({ ...base, text: brief }).model).toBe('sonnet')
})

test('fable is never chosen automatically', () => {
  const r = route({ ...base, topModel: safeTop('fable'), text: 'Concevoir une architecture' })
  expect(r.model).toBe('opus')
  expect(safeTop('claude-fable-5-2')).toBe('opus')
})

test('colors differ by family', () => {
  const c = ['haiku', 'sonnet', 'opus', 'fable'].map(modelDot)
  expect(new Set(c).size).toBe(4)
})

test('pretty model names', () => {
  expect(prettyModel('claude-sonnet-5-5')).toBe('Sonnet 5.5')
  expect(prettyModel('claude-opus-5-5-20261001')).toBe('Opus 5.5')
  expect(prettyModel('haiku')).toBe('haiku')
})
