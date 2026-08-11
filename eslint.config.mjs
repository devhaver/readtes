// @ts-check
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVueA11y from "eslint-plugin-vuejs-accessibility";
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    "func-style": ["error", "expression"],
  },
})
  // Agent worktrees live under .claude/worktrees/ inside the repo — each has
  // its own checkout and lint run; the root lint must never crawl into them.
  .prepend({
    ignores: ["**/.claude/**"],
  })
  // Override Vue rules to disable multi-word component names
  .override("nuxt/vue/rules", {
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/html-self-closing": [
        "warn",
        {
          html: {
            void: "always",
          },
        },
      ],
    },
  })
  // These reader components render only importer-normalized or
  // sanitizeHtml-processed content. Keep v-html forbidden everywhere else.
  .append({
    files: [
      "app/components/reader/CommentaryPane.vue",
      "app/components/reader/CommentarySheet.vue",
      "app/components/reader/InlineCommentary.vue",
      "app/components/reader/OriginalStream.vue",
      "app/components/reader/ReaderSourceSegment.vue",
      "app/components/reader/ReaderSummaryBody.vue",
      "app/components/reader/StudyStream.vue",
    ],
    name: "reader/trusted-html",
    rules: {
      "vue/no-v-html": "off",
    },
  })
  // Add accessibility config and rules
  .append(
    // Include the recommended preset
    pluginVueA11y.configs["flat/recommended"],
    {
      files: ["**/*.vue"],
      name: "accessibility/rules",
      plugins: {
        "vuejs-accessibility": pluginVueA11y,
      },
      rules: {
        "vuejs-accessibility/alt-text": "error",
        "vuejs-accessibility/anchor-has-content": "error",
        "vuejs-accessibility/click-events-have-key-events": "error",
        "vuejs-accessibility/form-control-has-label": "error",
        "vuejs-accessibility/heading-has-content": "error",
        "vuejs-accessibility/label-has-for": [
          "error",
          {
            required: {
              some: ["nesting", "id"],
            },
          },
        ],
      },
    },
    eslintConfigPrettier,
  );
