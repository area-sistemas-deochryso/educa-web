// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// #region Plugin local: WAL — enforcement de optimistic UI
// Verbos CRUD que indican mutación (deben pasar por WalFacadeHelper).
// NO incluye: listar/load/fetch/get (queries), enviar/importar/sync (batch/infra).
const WAL_MUTATION_VERBS = /^(crear|create|actualizar|update|editar|edit|eliminar|delete|remove|borrar|toggle|guardar|save|patch|put|post|aprobar|approve|rechazar|reject|cerrar|close|confirmar|confirm|cancelar|cancel|revertir|revert)/i;

const walPlugin = {
	rules: {
		'no-direct-mutation-subscribe': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Prohibe .subscribe() directo sobre mutaciones en facades. Deben pasar por WalFacadeHelper.execute() para garantizar optimistic UI + rollback determinista.',
				},
				messages: {
					useWal:
						"Mutación '{{method}}' directa con .subscribe() — usar wal.execute({ operation, optimistic: { apply, rollback }, onCommit, onError }). Si debe ser server-confirmed, pasar consistencyLevel: 'server-confirmed' con justificación escrita.",
				},
				schema: [],
			},
			create(context) {
				return {
					CallExpression(node) {
						if (node.callee?.type !== 'MemberExpression') return;
						if (node.callee.property?.name !== 'subscribe') return;

						// Walk through .pipe(...) chains to find the source call.
						let receiver = node.callee.object;
						while (
							receiver?.type === 'CallExpression' &&
							receiver.callee?.type === 'MemberExpression' &&
							receiver.callee.property?.name === 'pipe'
						) {
							receiver = receiver.callee.object;
						}
						if (receiver?.type !== 'CallExpression') return;

						const calleeMember = receiver.callee;
						if (calleeMember?.type !== 'MemberExpression') return;

						const method = calleeMember.property?.name;
						if (!method || !WAL_MUTATION_VERBS.test(method)) return;

						// Receiver must look like `this.api.xxx()` or a service.
						const obj = calleeMember.object;
						if (obj?.type !== 'MemberExpression') return;
						const objName = obj.property?.name?.toLowerCase() ?? '';
						if (objName.endsWith('store') || objName.endsWith('facade')) return;
						const looksLikeApi =
							objName === 'api' ||
							objName.endsWith('api') ||
							objName.endsWith('service');
						if (!looksLikeApi) return;

						context.report({ node, messageId: 'useWal', data: { method } });
					},
				};
			},
		},
	},
};
// #endregion

// #region Plugin local: Estructura y crecimiento
// Reglas contra crecimiento desproporcionado:
//   - no-deep-relative-imports: prohibe subir 3+ niveles con ../ (forzar alias o restructurar)
//   - no-repeated-blocks: advierte cuando una secuencia de 5+ sentencias se repite 3+ veces en el mismo archivo
const structurePlugin = {
	rules: {
		'no-deep-relative-imports': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Prohibe imports relativos de 3+ niveles de subida. Un archivo solo puede importar de hermanos, hijos o vía alias (@core, @shared, @features/*, @intranet-shared).',
				},
				messages: {
					tooDeep:
						"Import relativo '{{source}}' sube {{levels}} niveles — usar alias (@core, @shared, @features/*, @intranet-shared) o reestructurar. Un archivo no debería alcanzar una carpeta abuela externa; solo hermanos, hijos o la capa shared global.",
				},
				schema: [],
			},
			create(context) {
				return {
					ImportDeclaration(node) {
						const source = node.source.value;
						if (typeof source !== 'string') return;
						const match = source.match(/^((?:\.\.\/)+)/);
						if (!match) return;
						const levels = (match[1].match(/\.\.\//g) || []).length;
						if (levels >= 3) {
							context.report({
								node: node.source,
								messageId: 'tooDeep',
								data: { source, levels },
							});
						}
					},
				};
			},
		},

		'no-repeated-blocks': {
			meta: {
				type: 'suggestion',
				docs: {
					description:
						'Advierte cuando una secuencia de 5+ sentencias aparece 3+ veces en el mismo archivo. Extraer a una función o helper.',
				},
				messages: {
					repeated:
						'Secuencia de {{lines}} sentencias repetida {{count}} veces en este archivo — extraer a una función/helper.',
				},
				schema: [],
			},
			create(context) {
				const sourceCode = context.sourceCode ?? context.getSourceCode();
				const MIN_STATEMENTS = 5;
				const windows = new Map();

				function normalize(stmt) {
					return sourceCode.getText(stmt).replace(/\s+/g, ' ').trim();
				}

				return {
					BlockStatement(node) {
						const body = node.body;
						if (body.length < MIN_STATEMENTS) return;
						for (let i = 0; i <= body.length - MIN_STATEMENTS; i++) {
							const win = body.slice(i, i + MIN_STATEMENTS);
							const key = win.map(normalize).join('§');
							if (!windows.has(key)) windows.set(key, []);
							windows.get(key).push(win[0]);
						}
					},
					'Program:exit'() {
						const reported = new Set();
						for (const nodes of windows.values()) {
							if (nodes.length < 3) continue;
							for (const node of nodes) {
								const id = `${node.range[0]}-${node.range[1]}`;
								if (reported.has(id)) continue;
								reported.add(id);
								context.report({
									node,
									messageId: 'repeated',
									data: { count: nodes.length, lines: MIN_STATEMENTS },
								});
							}
						}
					},
				};
			},
		},

		// Detecta setters triviales compactados en una línea para evitar burlar max-lines.
		// Un setter trivial es un método cuyo cuerpo es una sola delegación 1:1 a this._field.method(param)
		// donde los argumentos coinciden exactamente con los parámetros del método.
		// Warn para 1-4 instancias, error para 5+ (señal de que el archivo necesita refactor real).
		'no-compact-trivial-setter': {
			meta: {
				type: 'suggestion',
				docs: {
					description:
						'Detecta setters triviales compactados en una línea (delegación 1:1 a signal/store). 5+ en un archivo indica que debería refactorizarse a BaseCrudStore, patchState pattern, o exponer store directamente.',
				},
				messages: {
					trivialCompacted:
						"Setter trivial compactado en una línea — expandir a formato multi-línea. Si el archivo acumula muchos, considerar BaseCrudStore o exponer store directamente.",
					tooManyTrivial:
						"{{count}} setters triviales compactados en este archivo — señal de que el store/facade debería reestructurarse (BaseCrudStore, patchState, o exponer store). Ver rules/crud-patterns.md.",
				},
				schema: [],
			},
			create(context) {
				const matches = [];
				return {
					MethodDefinition(node) {
						// Solo métodos de clase con cuerpo
						if (!node.value || !node.value.body || !node.value.body.body) return;
						const body = node.value.body.body;

						// Exactamente 1 sentencia
						if (body.length !== 1) return;

						// Todo en la misma línea (one-liner)
						if (node.loc.start.line !== node.loc.end.line) return;

						const stmt = body[0];

						// Debe ser ExpressionStatement con CallExpression
						if (stmt.type !== 'ExpressionStatement') return;
						if (!stmt.expression || stmt.expression.type !== 'CallExpression') return;

						const call = stmt.expression;
						const callee = call.callee;

						// Debe ser this.X.Y() — MemberExpression anidado
						if (callee.type !== 'MemberExpression') return;
						const obj = callee.object;
						if (obj.type !== 'MemberExpression') return;
						if (obj.object.type !== 'ThisExpression') return;

						// Los argumentos del call deben coincidir 1:1 con los parámetros del método
						const params = node.value.params;
						const args = call.arguments;

						if (args.length === 0 || params.length === 0) return;
						if (args.length !== params.length) return;

						const isPassthrough = args.every((arg, i) => {
							if (arg.type !== 'Identifier') return false;
							const param = params[i];
							// Soportar parámetros con tipo (TSTypeAnnotation) y sin tipo
							const paramName = param.type === 'Identifier' ? param.name
								: param.type === 'AssignmentPattern' ? (param.left?.name ?? null)
								: null;
							return paramName !== null && arg.name === paramName;
						});

						if (isPassthrough) {
							matches.push(node);
						}
					},
					'Program:exit'() {
						const THRESHOLD = 5;
						if (matches.length >= THRESHOLD) {
							for (const node of matches) {
								context.report({
									node,
									messageId: 'tooManyTrivial',
									data: { count: matches.length },
								});
							}
						} else {
							for (const node of matches) {
								context.report({
									node,
									messageId: 'trivialCompacted',
								});
							}
						}
					},
				};
			},
		},
	},
};
// #endregion

// #region Plugin local: layer-enforcement — fix G10 (override de no-restricted-imports)
// Problema: ESLint flat config reemplaza (no mergea) `no-restricted-imports` entre bloques
// que matchean el mismo archivo. El bloque de barrel enforcement (último) invalida las reglas
// intermedias para features/** y shared/**.
// Solución: un plugin propio con dos reglas (error/warn) que iteran una tabla declarativa y
// no son overrideadas porque tienen nombres únicos. Sustituye los bloques: shared, component,
// store, facade cross, admin, profesor, estudiante.
// Escape hatch: // eslint-disable-next-line layer-enforcement/imports-error -- Razón: <...>

function normalizePath(p) {
	return (p || '').replace(/\\/g, '/');
}

function hasImportedName(node, names) {
	if (!Array.isArray(names) || names.length === 0) return true;
	// ImportDeclaration: specifiers con imported.name (ImportSpecifier)
	// ExportNamedDeclaration con source: specifiers con local.name (ExportSpecifier)
	// ExportAllDeclaration: sin specifiers — si se pide importedNames específicos, no aplica
	if (node.type === 'ExportAllDeclaration') return false;
	return (node.specifiers || []).some((s) => {
		if (s.type === 'ImportSpecifier') return names.includes(s.imported?.name);
		if (s.type === 'ExportSpecifier') return names.includes(s.local?.name);
		return false;
	});
}

// Tabla declarativa de restricciones por capa.
// Cada entry: { id, severity, match(filename), restrictions: [{ sourcePattern, importedNames?, message }] }
// - sourcePattern: RegExp contra node.source.value
// - importedNames (opcional): solo reporta si el import trae alguno de estos named specifiers
const LAYER_RULES = [
	{
		id: 'shared-no-features',
		severity: 'error',
		match: (f) => /\/src\/app\/shared\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@features\//,
				message: 'shared/ no puede importar de features/ — dependencia inversa.',
			},
			{
				sourcePattern: /^@intranet-shared(\/|$)/,
				message: 'shared/ no puede importar de @intranet-shared — dependencia inversa.',
			},
		],
	},
	{
		id: 'component-no-http-no-store',
		severity: 'error',
		match: (f) => /\.component\.ts$/.test(f),
		restrictions: [
			{
				sourcePattern: /^@angular\/common\/http$/,
				importedNames: ['HttpClient'],
				message:
					'Components no deben usar HttpClient directamente — usar facade o service.',
			},
			{
				sourcePattern: /\.store(\.ts)?$/,
				message:
					'Components no deben importar stores directamente — consumir vía facade. El facade expone el vm/signals del store.',
			},
		],
	},
	{
		id: 'store-no-io-no-facade',
		severity: 'error',
		match: (f) => /\.store\.ts$/.test(f),
		restrictions: [
			{
				sourcePattern: /^@angular\/common\/http$/,
				importedNames: ['HttpClient'],
				message:
					'Stores no deben usar HttpClient — el facade orquesta IO y llama a store.setX() con el resultado.',
			},
			{
				sourcePattern: /\.facade(\.ts)?$/,
				message:
					'Stores no pueden importar facades — el flujo es facade → store, nunca al revés.',
			},
			{
				sourcePattern: /\.service(\.ts)?$/,
				message:
					'Stores no deben importar services de IO — el facade hace la llamada y entrega el resultado al store.',
			},
		],
	},
	{
		id: 'facade-no-cross-facade',
		severity: 'error',
		match: (f) =>
			/\.facade\.ts$/.test(f) &&
			!/-data\.facade\.ts$/.test(f) &&
			!/-crud\.facade\.ts$/.test(f) &&
			!/-ui\.facade\.ts$/.test(f),
		restrictions: [
			{
				sourcePattern: /\.facade(\.ts)?$/,
				message:
					'Facades no deben importar otros facades — genera acoplamiento. Orquestar desde el componente o extraer lógica compartida a un store. G9 del inventario F3.1 — 0 violaciones al 2026-04-14, subido a error.',
			},
		],
	},
	{
		id: 'admin-no-cross-feature',
		severity: 'error',
		match: (f) => /\/src\/app\/features\/intranet\/pages\/admin\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@features\/intranet\/pages\/profesor\//,
				message: 'admin/ no puede importar de profesor/ — features independientes.',
			},
			{
				sourcePattern: /^@features\/intranet\/pages\/estudiante\//,
				message: 'admin/ no puede importar de estudiante/ — features independientes.',
			},
		],
	},
	{
		id: 'profesor-no-cross-feature',
		severity: 'warn',
		match: (f) => /\/src\/app\/features\/intranet\/pages\/profesor\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@features\/intranet\/pages\/admin\//,
				message:
					'profesor/ no puede importar de admin/ — mover componentes compartidos a @intranet-shared.',
			},
			{
				sourcePattern: /^@features\/intranet\/pages\/estudiante\//,
				message: 'profesor/ no puede importar de estudiante/ — features independientes.',
			},
		],
	},
	{
		id: 'estudiante-no-cross-feature',
		severity: 'error',
		match: (f) => /\/src\/app\/features\/intranet\/pages\/estudiante\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@features\/intranet\/pages\/admin\//,
				message: 'estudiante/ no puede importar de admin/ — features independientes.',
			},
			{
				sourcePattern: /^@features\/intranet\/pages\/profesor\//,
				message: 'estudiante/ no puede importar de profesor/ — features independientes.',
			},
		],
	},
];

function createImportChecker(severityFilter) {
	return function check(context) {
		const filename = normalizePath(context.filename ?? context.getFilename());
		const applicable = LAYER_RULES.filter(
			(r) => r.severity === severityFilter && r.match(filename),
		);
		if (applicable.length === 0) return {};

		function checkNode(node) {
			const source = node.source?.value;
			if (typeof source !== 'string') return;
			for (const rule of applicable) {
				for (const restriction of rule.restrictions) {
					if (!restriction.sourcePattern.test(source)) continue;
					if (!hasImportedName(node, restriction.importedNames)) continue;
					context.report({
						node: node.source,
						message: restriction.message,
					});
					break; // un report por rule por declaración
				}
			}
		}

		return {
			ImportDeclaration: checkNode,
			// Re-exports (F5): `export * from 'x'` y `export { A } from 'x'` heredan las mismas
			// restricciones. Sin esto, un barrel de shared/ puede re-exportar @intranet-shared
			// y violar la dependencia invertida de forma invisible.
			ExportAllDeclaration: checkNode,
			ExportNamedDeclaration(node) {
				if (node.source) checkNode(node);
			},
		};
	};
}

const layerEnforcementPlugin = {
	rules: {
		'imports-error': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Restricciones de import por capa (shared/component/store/facade/cross-feature) con severidad error. Fix G10: reemplaza bloques no-restricted-imports overrideados por el barrel enforcement.',
				},
				schema: [],
			},
			create(context) {
				return createImportChecker('error')(context);
			},
		},
		'imports-warn': {
			meta: {
				type: 'suggestion',
				docs: {
					description:
						'Restricciones de import por capa con severidad warn (actualmente: profesor cross-feature).',
				},
				schema: [],
			},
			create(context) {
				return createImportChecker('warn')(context);
			},
		},
	},
};
// #endregion

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
		plugins: {
			structure: structurePlugin,
			'layer-enforcement': layerEnforcementPlugin,
		},
		rules: {
			// Estructura y crecimiento
			// max-lines: archivos > 300 líneas requieren escape hatch justificado a nivel de archivo.
			// Escape: /* eslint-disable max-lines -- Razón: <justificación específica> */ al inicio del archivo.
			'max-lines': [
				'error',
				{ max: 300, skipBlankLines: true, skipComments: true },
			],
			'structure/no-deep-relative-imports': 'error',
			'structure/no-repeated-blocks': 'warn',
			'structure/no-compact-trivial-setter': ['warn', ],

			// layer-enforcement (fix G10): reglas de restricción de imports por capa.
			// Tabla declarativa en LAYER_RULES. Nombres únicos evitan el override de no-restricted-imports.
			'layer-enforcement/imports-error': 'error',
			'layer-enforcement/imports-warn': 'warn',

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
			// G2 del inventario F3.1: document.cookie prohibido — usar StorageService.
			// Las cookies de auth son HttpOnly y las maneja el backend.
			'no-restricted-properties': [
				'error',
				{
					object: 'document',
					property: 'cookie',
					message:
						'document.cookie está prohibido — usar StorageService de @core/services/storage/. Las cookies de auth son HttpOnly y las maneja el backend.',
				},
			],
		},
	},
	// #endregion

	// #region Enforcement de capas — stores no hacen .subscribe() (regla aparte; imports en layer-enforcement)
	// "Un servicio no es estado. Es una fuente de estado." El store solo muta estado síncrono.
	// Escape hatch: // eslint-disable-next-line no-restricted-syntax -- Razón: <justificación específica>
	{
		files: ['src/app/**/*.store.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: "CallExpression[callee.property.name='subscribe']",
					message:
						'Stores no deben hacer .subscribe() — mover la suscripción al facade. El store solo muta estado síncrono.',
				},
			],
		},
	},
	// #endregion

	// #region Excepciones — base classes pueden tener delegates triviales (son la abstracción correcta)
	{
		files: ['src/app/core/**/base-*.ts', 'src/app/core/**/base-*.store.ts', 'src/app/core/**/base-*.facade.ts'],
		rules: {
			'structure/no-compact-trivial-setter': 'off',
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
		// Tests también están exentos de max-lines — describe blocks crecen linealmente con casos
		files: ['**/*.spec.ts'],
		rules: {
			'no-restricted-globals': 'off',
			'no-console': ['warn', { allow: ['error', 'warn'] }],
			'max-lines': 'off',
			'structure/no-repeated-blocks': 'off',
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
						{
							// G3 del inventario F3.1: WAL internals bloqueados en features/ y shared/.
							// Público: WalFacadeHelper, WalStatusStore, WalService, WalClockService, isConflictError/isPermanentError.
							group: [
								'@core/services/wal/wal-db*',
								'@core/services/wal/wal-sync-engine*',
								'@core/services/wal/wal-leader*',
								'@core/services/wal/wal-metrics*',
								'@core/services/wal/wal-cache-invalidator*',
								'@core/services/wal/wal-coalescer*',
								'@core/services/wal/wal-http*',
								'@core/services/wal/wal-error*',
							],
							message:
								'WAL internals — usar WalFacadeHelper o WalStatusStore desde @core/services.',
						},
						{
							// G4 del inventario F3.1: CacheVersionManagerService es interno.
							// Público: CacheInvalidationService.
							group: ['@core/services/cache/cache-version-manager*'],
							message:
								'CacheVersionManagerService es interno — usar CacheInvalidationService desde @core/services.',
						},
					],
				},
			],
		},
	},
	// #endregion

	// #region WAL — optimistic UI enforcement en facades
	// Reglas para *.facade.ts: toda mutación debe pasar por WalFacadeHelper.
	// Excepciones: *-data.facade.ts (read-only) y *-ui.facade.ts (state UI).
	{
		files: ['src/app/features/**/*.facade.ts', 'src/app/core/services/**/*.facade.ts'],
		ignores: [
			'src/app/**/*-data.facade.ts',
			'src/app/**/*-ui.facade.ts',
			'**/*.spec.ts',
		],
		plugins: {
			wal: walPlugin,
		},
		rules: {
			'wal/no-direct-mutation-subscribe': 'error',
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
