import type { Effort, Route } from '../types'

// Whole words, accents included: `\b` and `\w` are ASCII-only in JavaScript.
const words = (body: string, anchored = false): RegExp =>
  new RegExp(`${anchored ? '^' : '(?<![\\p{L}\\d])'}(?:${body})(?![\\p{L}\\d])`, 'iu')

const W = '\\p{L}*'

const HARD = words(
  `con[cç]e?voi[rs]?|concevoir|con[cç]u|design|architect${W}|refactor${W}|refonte|migr${W}|strat[ée]gi${W}|s[ée]curit[ée]|security|audit${W}|planifi${W}|plan d'impl[ée]mentation|race condition|deadlock|performance|optimi[sz]${W}|pourquoi .* (?:[ée]choue|plante|fail)${W}|root cause|cause racine`,
)

const EDIT = words(
  `corrige${W}|fix${W}|impl[ée]ment${W}|ajoute${W}|add|modifi${W}|change${W}|cr[ée]e${W}|create|[ée]cri[st]${W}|write|test${W}|review|revue|d[ée]bogue${W}|debug${W}|commit${W}|push|merge|pr|pull request`,
)

/** A very small change: Opus is not worth it, Sonnet does it. */
const SMALL = words(
  `typo${W}|faute${W}|coquille${W}|renomm${W}|rename${W}|une ligne|one[- ]line|petit${W}|small|minor|mineur${W}|trivial${W}|tiny|simple${W}|bump|version|commentaire${W}|comment|libell[ée]${W}|label|couleur${W}|color|espace${W}|whitespace`,
)

const SMALL_MAX = 200

/** Git, CI and PR housekeeping: Sonnet handles it, Opus is not worth it. */
const OPS = words(
  `merg${W}|fusionn${W}|conflit${W}|conflicts?|rebas${W}|ci|checks?|pipelines?|workflows?|rerun|relanc${W}|commit${W}|push${W}|pouss${W}|pr|prs|pull requests?|archiv${W}|labels?|[ée]tiquet${W}|tags?|releases?`,
)

/** Building something new: stays on the top model even next to an OPS word. */
const BUILD = words(
  `impl[ée]ment${W}|ajoute${W}|add|cr[ée]e[rz]?|create|[ée]cri[st]${W}|write|fonctionnalit[ée]s?|feature${W}|bugs?|bogues?|r[ée]gression${W}`,
)

const OPS_MAX = 300

/** Text Claude Code writes itself when a conversation is compacted. */
const SUMMARY = /^This session is being continued from a previous conversation/
/** A brief another session hands to the one it starts. */
const BRIEF = /^Background \(from the session that started this one\)/

const LOOKUP = words(
  `o[uù]|liste|list|montre|show|affiche|quel(?:le)?s?|what|which|where|who|when|cherche|trouve|find|search|lis|read|r[ée]sume|summari[sz]e|traduis|translate|explique|explain|combien|how many|est-ce que|is|are|does|do`,
  true,
)

/** A reply that only answers the previous turn: keep its route. */
const FOLLOW_UP =
  /^(?:oui|non|ok|okay|yes|no|go|vas-?y|continue|d'accord|parfait|merci|thanks?|fais[- ]le|do it|proceed|[1-9]|[a-c])(?:[\s,]+[\p{L}'-]+){0,3}[\s.!]*$/iu

/** Fable drains usage: never chosen automatically, even as `topModel`. */
export const safeTop = (model: string): string => (/fable/i.test(model) ? 'opus' : model)

export const modelColor = (id: string): string => {
  if (/haiku/i.test(id)) return '#4ade80'
  if (/sonnet/i.test(id)) return '#60a5fa'
  if (/opus/i.test(id)) return '#c084fc'
  if (/fable/i.test(id)) return '#fb923c'
  return '#9ca3af'
}

export const modelDot = (id: string): string => {
  if (/haiku/i.test(id)) return '🟢'
  if (/sonnet/i.test(id)) return '🔵'
  if (/opus/i.test(id)) return '🟣'
  if (/fable/i.test(id)) return '🟠'
  return '⚪'
}

export type Inputs = {
  text: string
  hasAttachments: boolean
  previous: Route | null
  topModel: string
}

/**
 * Picks a model and effort for each prompt from its wording and length alone.
 *
 * Code modifications and design go to `topModel` (Opus); Git, CI and PR
 * housekeeping and very small changes go to Sonnet. Every prompt is routed on
 * its own: a conversation is never pinned to Opus by its first prompt. A
 * compaction summary keeps the previous route, and a session brief is not
 * hard just because it is long.
 */
export const route = ({ text, hasAttachments, previous, topModel }: Inputs): Route => {
  const t = text.trim()

  if (previous && t.length <= 40 && FOLLOW_UP.test(t)) {
    return { ...previous, reason: 'suite du tour précédent' }
  }

  if (SUMMARY.test(t)) {
    return previous
      ? { ...previous, reason: 'reprise après compaction' }
      : pick('sonnet', 'medium', 'reprise après compaction')
  }

  if ((t.length > 1500 && !BRIEF.test(t)) || HARD.test(t)) {
    const reason = t.length > 1500 && !BRIEF.test(t) ? 'prompt long' : 'conception / analyse'
    return pick(topModel, 'high', reason)
  }

  if (!hasAttachments && t.length <= OPS_MAX && OPS.test(t) && !BUILD.test(t)) {
    return pick('sonnet', 'medium', 'git / CI / PR')
  }

  if (EDIT.test(t) || hasAttachments) {
    if (!hasAttachments && t.length <= SMALL_MAX && SMALL.test(t)) {
      return pick('sonnet', 'low', 'très petite modification')
    }
    const reason = hasAttachments ? 'pièce jointe' : 'modification de code'
    return pick(topModel, 'high', reason)
  }

  if (t.length <= 160 && LOOKUP.test(t)) {
    return pick('haiku', 'low', 'question courte / recherche')
  }

  return pick('sonnet', 'medium', 'par défaut')
}

const pick = (model: string, effort: Effort, reason: string): Route => ({ model, effort, reason })

const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const asEffort = (value: unknown): Effort | undefined =>
  typeof value === 'string' && EFFORTS.includes(value) ? (value as Effort) : undefined

/** `claude-sonnet-5-5-20261001` → `Sonnet 5.5`; anything else as given. */
export const prettyModel = (id: string): string => {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?/.exec(id)
  if (!m?.[1]) return id
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  return m[3] ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`
}

const EFFORT_FR: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  xhigh: 'Très élevé',
  max: 'Max',
}

export const prettyEffort = (effort: unknown): string =>
  typeof effort === 'string' ? (EFFORT_FR[effort] ?? effort) : ''
