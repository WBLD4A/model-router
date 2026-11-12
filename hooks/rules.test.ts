import { expect, test } from 'claude-code/testing'

import { modelDot, prettyModel, route, safeTop } from './rules.ts'

const base = { hasAttachments: false, previous: null, topModel: 'opus' }

test('routes by wording', () => {
  expect(route({ ...base, text: 'où est le fichier routing.json ?' }).model).toBe('haiku')
  expect(route({ ...base, text: 'corrige le test qui échoue dans setup' }).model).toBe('sonnet')
  expect(route({ ...base, text: 'Concevoir un plugin qui fixe le modèle' }).model).toBe('opus')
  expect(route({ ...base, text: 'vérifie la sécurité du module' }).model).toBe('opus')
  expect(route({ ...base, text: 'liste les skills installés' }).effort).toBe('low')
  expect(route({ ...base, text: 'x'.repeat(2000) }).effort).toBe('high')
})

test('a follow-up keeps the previous route', () => {
  const previous = { model: 'opus', effort: 'high' as const, reason: 'conception / analyse' }
  expect(route({ ...base, previous, text: 'oui' }).model).toBe('opus')
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
