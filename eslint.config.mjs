import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['**/dist/'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'func-style': ['error', 'declaration'],
    },
  },
  {
    files: ['client/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Colors live as tokens in client/src/index.css only — reference them via var(--…).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message: 'Hex colors are banned in code. Define a token in client/src/index.css and use var(--…).',
        },
        {
          selector: 'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message: 'Hex colors are banned in code. Define a token in client/src/index.css and use var(--…).',
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateLiteral",
          message: 'No template literals in className. Use cn(base, { override: condition }) — default class + conditional override only.',
        },
        // cursor: pointer comes from a global rule in client/src/index.css (button, a[href], [role="button"]).
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/(^|\\s)cursor-pointer(\\s|$)/]",
          message: 'Do not add cursor-pointer per component — the global rule in client/src/index.css covers button, a[href], and [role="button"].',
        },
        {
          selector: "JSXOpeningElement[name.name=/^(?!(a|button|input|select|option|summary|label|textarea|details|area)$)[a-z]/]:has(JSXAttribute[name.name='onClick']):not(:has(JSXAttribute[name.name='role'][value.value='button']))",
          message: 'Anything clickable must show cursor: pointer. Use a real <button>/<a href>, or add role="button" so the global cursor rule in client/src/index.css applies. Other interactive roles need their own entry in that CSS rule.',
        },
      ],
    },
  },
)
