# Read TES — Claude context

Static (SSG) Nuxt 4 app for reading _Talmud Eser Sefirot_ as the Ari's text,
Inner Light, and Inner Observation, multilingual with first-class Hebrew
RTL. No runtime APIs — everything prerenders.

## Always-on rules

Breaking these produces code that looks fine and is wrong:

- **Arrow functions only** — `const doThing = () => {}`, never `function`.
- **Logical CSS only** — `ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`.
  Never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`. Hebrew RTL is first-class.
- **Design tokens only, never a literal hex.**
- **pnpm only**, never npm/yarn. Dev server **6217** (HMR **6218**).
- **No AI attribution** in commits, PRs, issues, or comments. Conventional
  commit subjects. The one exception: the `en-ai` translation version **must**
  be badged "AI translated" in the UI.
- **Git only when asked.** Otherwise leave changes in the working tree.

## Definition of done

```
task check
```

Runs lint, format:check, typecheck, validate:content, test, and generate. All
of it passes before committing.

## Where the detail lives

Nothing else is preloaded. Two mechanisms fill in context as you work:

- **`.claude/rules/`** — conventions, loaded **automatically** when you read a
  matching file (app code, content, tests, importers, SEO). You don't invoke
  these; they fire on path match.
- **`.agents/skills/`** — procedures and reference (`tes-content-model`,
  `tes-seo-ssg`, `tes-testing`, `tes-import-sefaria`,
  `tes-import-kabbalahmedia`, `tes-pnpm-setup`), loaded when you invoke them.
  `.claude/skills/` symlinks to the same directories.

`AGENTS.md` is the full standalone reference, kept complete so a cold Codex or
Cursor run is productive. It is **not** imported here — don't read it whole;
the rule or skill for your task already has what you need.
