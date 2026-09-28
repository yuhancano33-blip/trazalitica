import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/', 'supabase/.temp/'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Spec 1 / AGENTS.md §7: prohibido v-html con contenido de usuario
      'vue/no-v-html': 'error',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-lang': ['error', { script: { allowNoLang: true } }],
    },
  },
  {
    // El frontend nunca referencia la llave service_role (Spec 7)
    files: ['src/**/*.{js,vue}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/SERVICE_ROLE/i]',
          message: 'La llave service_role nunca se usa en el frontend.',
        },
        {
          selector: 'Literal[value=/service_role/i]',
          message: 'La llave service_role nunca se usa en el frontend.',
        },
      ],
    },
  },
  prettier,
];
