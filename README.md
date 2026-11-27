# model-router

Claude Code mod that picks the model and effort for each prompt you send, keeps
the effort each skill imposes, and shows the model that really answered.

## Install

```
/plugin marketplace add WBLD4A/model-router
/plugin install model-router@model-router
```

## What it does

- **Per prompt**: any code modification, design, architecture, security or long
  prompt goes to the `topModel` option (default `opus`)/high, except:
  - Git, CI and PR housekeeping (merge, conflicts, rebase, CI, commit, push,
    PR, archive...) in a short prompt that builds nothing new (no implement,
    add, create, feature or bug) goes to `sonnet`/medium;
  - a very small change (typo, rename, one line, label...) goes to `sonnet`/low.
  A short lookup goes to `haiku`/low, anything else to `sonnet`/medium. A
  short follow-up ("oui", "go", "Oui, archiver") keeps the previous turn's route.
- **Each prompt on its own**: no prompt pins the conversation to a model, so a
  merge after an Opus implementation goes back to Sonnet. A compaction summary
  keeps the previous route, and a brief handed to a new session is not routed
  to `topModel` just for its length.
- **Skills**: once a skill loads, the `effort:` (and `model:`, if any) of its
  `SKILL.md` frontmatter wins for the rest of the turn. The router reads that
  file itself when the Skill tool is called or a `/skill` command is typed,
  from the project's `.claude/skills` then the user's: it does not rely on the
  `skill.prompt` event, which a managed plugin may send past user mods. A skill
  found only inside a plugin keeps the prompt's route.
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
