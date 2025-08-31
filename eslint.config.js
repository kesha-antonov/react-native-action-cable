const js = require('@eslint/js')

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      'semi': ['error', 'never'],
      'no-console': 'off',
      'no-unused-vars': 'warn'
    }
  }
]