# model-router

Claude Code mod that picks the model and effort for each prompt you send, keeps
the effort each skill imposes, and shows the model that really answered.

## Install

```
/plugin marketplace add WBLD4A/model-router
/plugin install model-router@model-router
```

## What it does

- **Per prompt**: a short lookup goes to `haiku`/low, code changes to
  `sonnet`/medium, design, architecture, security or long prompts to the
  `topModel` option (default `opus`)/high. A one-word follow-up ("oui", "go")
  keeps the previous turn's route. The choice holds for the whole turn.
- **Skills**: once a skill loads, the `effort:` (and `model:`, if any) of its
  `SKILL.md` frontmatter wins for the rest of the turn.
- **Subagents** keep the model their spawn asked for.
- **Fable** is never chosen automatically, even as `topModel`; a session you put
  on Fable yourself is left alone.
- **Status**: after each model call the status line shows
  `🔵 Sonnet 5.5 · Moyen`: a dot per family (🟢 Haiku, 🔵 Sonnet, 🟣 Opus,
  🟠 Fable), then the model the API reports and the effort. The footer draws
  plain text only, so a dot is the only color available there.

The app's own model picker is not changed: the route applies per request, and
the picker keeps showing the session's setting. Switching models between turns
loses the prompt cache of the previous model.

## Options

| Option | Values | Default |
| --- | --- | --- |
| `mode` | `auto` routes; `observe` only shows the model that answered | `auto` |
| `topModel` | alias or id for hard prompts | `opus` |

The rules live in `hooks/rules.ts`; tests run with `claude plugin test .`.

## License

MIT
