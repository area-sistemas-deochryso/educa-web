// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
	{
		files: ['**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			...angular.configs.tsRecommended,
		],
		processor: angular.processInlineTemplates,
		rules: {
			// Angular rules
			'@angular-eslint/component-class-suffix': 'error',
			'@angular-eslint/directive-class-suffix': 'error',
			'@angular-eslint/no-empty-lifecycle-method': 'warn',
			'@angular-eslint/prefer-standalone': 'error',
			'@angular-eslint/directive-selector': [
				'error',
				{
					type: 'attribute',
					prefix: 'app',
					style: 'camelCase',
				},
			],
			'@angular-eslint/component-selector': [
				'error',
				{
					type: 'element',
					prefix: 'app',
					style: 'kebab-case',
				},
			],

			// TypeScript rules
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

			// General rules
			'no-console': ['warn', { allow: ['error', 'warn'] }],
			'prefer-const': 'error',
			'no-var': 'error',
		},
	},
	{
		files: ['**/*.html'],
		extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
		rules: {
			// Disable rules that conflict with PrimeNG
			// PrimeNG's pButton directive generates content internally via label/icon attributes
			'@angular-eslint/template/elements-content': 'off',

			// Disable rules that are too strict for most projects
			'@angular-eslint/template/click-events-have-key-events': 'off',
			'@angular-eslint/template/interactive-supports-focus': 'off',
			'@angular-eslint/template/label-has-associated-control': 'off',
		},
	},
);
