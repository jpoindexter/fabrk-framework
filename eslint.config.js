// @ts-check
import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

// ---------------------------------------------------------------------------
// Design System Enforcement Rule
//
// Prevents hardcoded Tailwind color classes (bg-blue-500, text-white, etc.)
// in className props. Components must use semantic design tokens instead.
// ---------------------------------------------------------------------------

const DS_HARDCODED_COLORS = [
  'slate','gray','zinc','neutral','stone',
  'red','orange','amber','yellow','lime',
  'green','emerald','teal','cyan','sky',
  'blue','indigo','violet','purple','fuchsia',
  'pink','rose',
]
const DS_COLOR_PREFIXES = ['bg','text','border','ring','fill','stroke','outline','decoration','from','via','to']
const DS_HARDCODED_RE = new RegExp(
  `^(?:${DS_COLOR_PREFIXES.join('|')})-(?:${DS_HARDCODED_COLORS.join('|')})-(?:\\d+|\\[.+\\])$`
)
const DS_BARE_RE = /^(?:bg|text|border|ring)-(?:white|black)$/

function getHardcodedViolations(classString) {
  return classString
    .split(/\s+/)
    .filter((cls) => {
      const base = cls.replace(/^(?:[a-zA-Z0-9_-]+:)+/, '') // strip sm:, hover:, etc.
      return DS_HARDCODED_RE.test(base) || DS_BARE_RE.test(base)
    })
}

// ---------------------------------------------------------------------------
// Design System Enforcement Rule: no-font-mono
//
// Prevents `font-mono` in className props and cn() calls.
// Components must use `mode.font` from @fabrk/design-system instead so the
// monospace font family adapts with the active theme.
// ---------------------------------------------------------------------------

const noFontMono = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent hardcoded font-mono — use mode.font from @fabrk/design-system',
    },
    schema: [],
  },
  create(context) {
    function checkClassString(node, classString) {
      const classes = classString.split(/\s+/)
      if (classes.includes('font-mono')) {
        context.report({
          node,
          message:
            'Hardcoded "font-mono" violates FABRK design system. Use mode.font from @fabrk/design-system so the font adapts with the active theme.',
        })
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        if (!node.value) return
        const val = node.value
        if (val.type === 'Literal' && typeof val.value === 'string') {
          checkClassString(node, val.value)
          return
        }
        if (
          val.type === 'JSXExpressionContainer' &&
          val.expression.type === 'Literal' &&
          typeof val.expression.value === 'string'
        ) {
          checkClassString(node, val.expression.value)
          return
        }
        if (
          val.type === 'JSXExpressionContainer' &&
          val.expression.type === 'TemplateLiteral'
        ) {
          for (const quasi of val.expression.quasis) {
            checkClassString(node, quasi.value.cooked ?? quasi.value.raw)
          }
        }
      },
      CallExpression(node) {
        const callee = node.callee
        const name = callee.type === 'Identifier' ? callee.name : null
        if (name !== 'cn' && name !== 'clsx' && name !== 'cx') return
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkClassString(arg, arg.value)
          }
        }
      },
    }
  },
}

const noHardcodedColors = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent hardcoded Tailwind color classes — use design system semantic tokens',
    },
    schema: [],
  },
  create(context) {
    function checkClassString(node, classString) {
      const violations = getHardcodedViolations(classString)
      for (const v of violations) {
        context.report({
          node,
          message: `Hardcoded color "${v}" violates FABRK design system. Use semantic tokens: bg-primary, text-foreground, border-border, etc. See DESIGN_SYSTEM_RULES.md`,
        })
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        if (!node.value) return

        const val = node.value
        // className="bg-blue-500 ..."
        if (val.type === 'Literal' && typeof val.value === 'string') {
          checkClassString(node, val.value)
          return
        }
        // className={'bg-blue-500 ...'}
        if (
          val.type === 'JSXExpressionContainer' &&
          val.expression.type === 'Literal' &&
          typeof val.expression.value === 'string'
        ) {
          checkClassString(node, val.expression.value)
          return
        }
        // className={`bg-blue-500 ${extra}`} — check static parts only
        if (
          val.type === 'JSXExpressionContainer' &&
          val.expression.type === 'TemplateLiteral'
        ) {
          for (const quasi of val.expression.quasis) {
            checkClassString(node, quasi.value.cooked ?? quasi.value.raw)
          }
        }
      },
      // Also catch cn('bg-blue-500', ...) and clsx('bg-blue-500', ...) call sites
      CallExpression(node) {
        const callee = node.callee
        const name = callee.type === 'Identifier' ? callee.name : null
        if (name !== 'cn' && name !== 'clsx' && name !== 'cx') return
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkClassString(arg, arg.value)
          }
        }
      },
    }
  },
}

/**
 * Root ESLint configuration for FABRK monorepo
 * Packages can extend this configuration
 */
export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/out/**',
      '**/*.config.js',
      '**/*.config.mjs',
    ],
  },

  // Base JavaScript configuration
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      fabrk: { rules: { 'no-hardcoded-colors': noHardcodedColors, 'no-font-mono': noFontMono } },
    },
    rules: {
      // Design system
      'fabrk/no-hardcoded-colors': 'error',
      'fabrk/no-font-mono': 'error',

      // Disable base rules that TypeScript handles natively
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js 13+
      'react/prop-types': 'off', // Using TypeScript
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // JavaScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
]
