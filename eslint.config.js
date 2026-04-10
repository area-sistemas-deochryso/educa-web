// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
	// #region Base TS config
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
			'no-console': ['error', { allow: ['error', 'warn'] }],
			'prefer-const': 'error',
			'no-var': 'error',

			// Prohibir acceso directo a storage APIs — usar StorageService
			'no-restricted-globals': [
				'error',
				{
					name: 'localStorage',
					message: 'Usar StorageService de @core/services/storage/ en su lugar.',
				},
				{
					name: 'sessionStorage',
					message: 'Usar StorageService de @core/services/storage/ en su lugar.',
				},
			],
		},
	},
	// #endregion

	// #region Enforcement de capas — shared/ no importa de features ni intranet-shared
	{
		files: ['src/app/shared/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@features/*'],
							message: 'shared/ no puede importar de features/ — dependencia inversa.',
						},
						{
							group: ['@intranet-shared', '@intranet-shared/*'],
							message:
								'shared/ no puede importar de @intranet-shared — dependencia inversa.',
						},
					],
				},
			],
		},
	},
	// #endregion

	// #region Enforcement de capas — components no usan HttpClient (tipos como HttpErrorResponse sí)
	{
		files: ['src/app/**/*.component.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@angular/common/http',
							importNames: ['HttpClient'],
							message:
								'Components no deben usar HttpClient directamente — usar facade o service.',
						},
					],
				},
			],
		},
	},
	// #endregion

	// #region Enforcement de capas — features no importan de otras features
	{
		files: ['src/app/features/intranet/pages/admin/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@features/intranet/pages/profesor/*'],
							message: 'admin/ no puede importar de profesor/ — features independientes.',
						},
						{
							group: ['@features/intranet/pages/estudiante/*'],
							message:
								'admin/ no puede importar de estudiante/ — features independientes.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/app/features/intranet/pages/profesor/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'warn',
				{
					patterns: [
						{
							group: ['@features/intranet/pages/admin/*'],
							message:
								'profesor/ no puede importar de admin/ — mover componentes compartidos a @intranet-shared.',
						},
						{
							group: ['@features/intranet/pages/estudiante/*'],
							message:
								'profesor/ no puede importar de estudiante/ — features independientes.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/app/features/intranet/pages/estudiante/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@features/intranet/pages/admin/*'],
							message:
								'estudiante/ no puede importar de admin/ — features independientes.',
						},
						{
							group: ['@features/intranet/pages/profesor/*'],
							message:
								'estudiante/ no puede importar de profesor/ — features independientes.',
						},
					],
				},
			],
		},
	},
	// #endregion

	// #region Excepciones — servicios de infraestructura que necesitan APIs directas
	{
		files: ['src/app/core/services/storage/**/*.ts'],
		rules: {
			'no-restricted-globals': 'off',
		},
	},
	{
		// Debug y cache usan localStorage directamente (son infraestructura, no negocio)
		files: [
			'src/app/core/helpers/debug/**/*.ts',
			'src/app/core/services/cache/**/*.ts',
		],
		rules: {
			'no-restricted-globals': 'off',
		},
	},
	{
		// logger.ts ES el wrapper de console — necesita acceso directo
		files: [
			'src/app/core/helpers/logs/**/*.ts',
			'src/app/core/services/cache/**/*.ts',
		],
		rules: {
			'no-console': 'off',
		},
	},
	{
		// Tests pueden usar localStorage y console para setup/mocking
		files: ['**/*.spec.ts'],
		rules: {
			'no-restricted-globals': 'off',
			'no-console': ['warn', { allow: ['error', 'warn'] }],
		},
	},
	// #endregion

	// #region Enforcement de barrels — features/ y shared/ solo usan facades públicas
	{
		files: [
			'src/app/features/**/*.ts',
			'src/app/shared/**/*.ts',
		],
		ignores: ['**/*.spec.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@core/services/storage/session-storage*',
								'@core/services/storage/preferences-storage*',
								'@core/services/storage/notification-storage*',
								'@core/services/storage/indexed-db*',
								'@core/services/storage/cache-storage*',
								'@core/services/storage/smart-data*',
							],
							message:
								'Usar StorageService de @core/services en lugar de servicios internos de storage.',
						},
						{
							group: ['@core/services/auth/auth-api*'],
							message:
								'Usar AuthService de @core/services en lugar de AuthApiService (interno).',
						},
						{
							group: [
								'@core/services/session/session-coordinator*',
								'@core/services/session/session-refresh*',
							],
							message:
								'Usar SessionActivityService de @core/services en lugar de servicios internos de session.',
						},
					],
				},
			],
		},
	},
	// #endregion

	// #region HTML config
	{
		files: ['**/*.html'],
		extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
		rules: {
			// Disable rules that conflict with PrimeNG
			'@angular-eslint/template/elements-content': 'off',
			'@angular-eslint/template/click-events-have-key-events': 'off',
			'@angular-eslint/template/interactive-supports-focus': 'off',
			'@angular-eslint/template/label-has-associated-control': 'off',
		},
	},
	// #endregion
);
