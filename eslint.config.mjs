// @ts-check
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'func-style': ['error', 'expression'],
  },
})
  // Override Vue rules to disable multi-word component names
  .override('nuxt/vue/rules', {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': [
        'warn',
        {
          html: {
            void: 'always',
          },
        },
      ],
    },
  })
  // Add accessibility config and rules
  .append(
    // Include the recommended preset
    pluginVueA11y.configs['flat/recommended'],
    {
      files: ['**/*.vue'],
      name: 'accessibility/rules',
      plugins: {
        'vuejs-accessibility': pluginVueA11y,
      },
      rules: {
        'vuejs-accessibility/alt-text': 'error',
        'vuejs-accessibility/anchor-has-content': 'error',
        'vuejs-accessibility/click-events-have-key-events': 'error',
        'vuejs-accessibility/form-control-has-label': 'error',
        'vuejs-accessibility/heading-has-content': 'error',
        'vuejs-accessibility/label-has-for': [
          'error',
          {
            required: {
              some: ['nesting', 'id'],
            },
          },
        ],
      },
    },
    eslintConfigPrettier,
  )
