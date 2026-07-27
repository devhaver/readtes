---
paths:
  - "tests/**"
  - "vitest.config.ts"
---

# Tests

**Load the `tes-testing` skill** for setup detail and the guardrail inventory.

- Vitest under the `@nuxt/test-utils` `nuxt` environment. Mount components
  with `mountSuspended` from `@nuxt/test-utils/runtime` — plain `mount` won't
  resolve auto-imports or async setup.
- **Some specs are architectural guardrails, not unit tests**:
  `no-full-toc-import`, `content-integrity`, `manifest-prefetch`, `sitemap`.
  If one fails, fix the change — never weaken or delete the spec to make it
  pass.
