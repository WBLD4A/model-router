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

test('very small changes use sonnet, other edits start on opus', () => {
  const small = route({ ...base, text: 'corrige la faute dans le titre du README' })
  expect(small).toMatchObject({ model: 'sonnet', effort: 'low', lock: true })
  expect(route({ ...base, text: 'ajoute une option au routeur' })).toMatchObject({
    model: 'opus',
    lock: true,
  })
})

test('the model stays fixed once locked, the effort still follows', () => {
  const locked = 'opus'
  expect(route({ ...base, locked, text: 'corrige la faute dans le titre' })).toMatchObject({
    model: 'opus',
    effort: 'low',
  })
  expect(route({ ...base, locked, text: 'où est le fichier routing.json ?' })).toMatchObject({
    model: 'opus',
    effort: 'low',
  })
  expect(route({ ...base, locked: 'sonnet', text: 'Concevoir une architecture' }).model).toBe(
    'sonnet',
  )
})

test('lookups do not lock the conversation', () => {
  expect(route({ ...base, text: 'où est le fichier routing.json ?' }).lock).toBeUndefined()
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
