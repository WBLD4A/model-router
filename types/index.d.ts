export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** The model and effort chosen for one turn, and why. */
export type Route = { model: string; effort: Effort; reason: string }

/** What the band draws: the model that really answered. */
export type Shown = { model: string; effort: string; why: string }

declare module 'claude-code' {
  interface PluginState {
    'model-router': { last: Route | null; shown: Shown | null }
  }
}
