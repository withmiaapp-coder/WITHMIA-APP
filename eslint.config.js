import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // TypeScript configuration
  ...tseslint.configs.recommended,
  
  // Prettier configuration (must be last)
  prettier,
  
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React Rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript instead
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      
      // React Hooks Rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // TypeScript Rules - More permissive for Laravel/Inertia projects
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off', // Disabled for flexibility
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      
      // General Rules - More permissive
      'no-console': 'off', // Allow console.log for development
      'no-debugger': 'warn',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-arrow-callback': 'off',
      
      // Import/Export Rules - Disabled for Laravel projects
      'no-restricted-imports': 'off',
    },
  },
  
  // Specific configurations for different file types
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      // JSX-specific rules
      'react/jsx-no-undef': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-key': 'warn',
    },
  },
  
  // Configuration for test files
  {
    files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  
  // Configuration for configuration files
  {
    files: ['*.config.{js,ts}', 'vite.config.{js,ts}', 'tailwind.config.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  
  // Ignore patterns - Comprehensive list for Laravel/Inertia projects
  {
    ignores: [
      // Dependencies
      'node_modules/**',
      
      // Build outputs and public assets
      'public/**',
      'dist/**',
      'build/**',
      
      // Laravel specific
      'bootstrap/cache/**',
      'storage/**',
      'vendor/**',
      
      // Generated and minified files
      '*.min.js',
      '*.min.css',
      '*.map',
      
      // Development files
      '.git/**',
      '.vscode/**',
      '.idea/**',
      
      // Coverage and logs
      'coverage/**',
      '*.log',
      
      // Environment and config files
      '.env*',
      '*.config.js',
      '*.config.ts',
      'webpack.config.js',
      'vite.config.ts',
      'tailwind.config.js',
      
      // Temporary files
      '*.tmp',
      '*.temp',
      '*~',
      
      // OS files
      '.DS_Store',
      'Thumbs.db',
    ],
  },
];