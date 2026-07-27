---
name: tes-pnpm-setup
description: pnpm 11 setup gotchas for this repo — the ERR_PNPM_IGNORED_BUILDS / allowBuilds placeholder dance, why pnpm.onlyBuiltDependencies in package.json is ignored, and the no-workspaces-field rule. Use when a fresh clone fails to install, when pnpm prints an ignored-builds warning, or when changing dependency/build configuration.
---

# pnpm 11 setup and gotchas

Use `pnpm`, never `npm`/`yarn`. `task setup` runs
`pnpm install --frozen-lockfile`, cached on `package.json`/`pnpm-lock.yaml`.

- **`allowBuilds` placeholders.** The first `pnpm install` in a fresh clone
  writes an `allowBuilds:` map into `pnpm-workspace.yaml` for any dependency
  with a build script (e.g. `esbuild`, `unrs-resolver`, `@parcel/watcher`,
  `sharp`), with placeholder values `set this to true or false`, and stops
  package build scripts short with `ERR_PNPM_IGNORED_BUILDS`. Replace each
  placeholder with `true` (or `false` if you don't want the script to run)
  and re-run `pnpm install`. The values are already resolved in this repo's
  `pnpm-workspace.yaml` — this only bites on a from-scratch registry change.
- **Config location.** `pnpm.onlyBuiltDependencies` / `pnpm.allowBuilds` in
  `package.json` are **not** honored by pnpm 11 — only `pnpm-workspace.yaml`
  is read. The key is `allowBuilds:` (a map), not the older list-shaped
  `onlyBuiltDependencies:`.
- **No `workspaces` field.** This is a single-package repo. Never add a
  top-level `workspaces` field to `package.json` (an npm/yarn convention,
  ignored by pnpm with a warning) — if the project ever needs a workspace,
  use `packages:` in `pnpm-workspace.yaml`.
- **`minimumReleaseAge`.** If a global `.npmrc` sets one, a freshly
  scaffolded lockfile can fail with
  `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` because scaffolders resolve to
  just-published versions. Fix with `pnpm clean --lockfile && pnpm install`.
