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

// #region Plugin local: api-shape — anti-pattern del unwrap doble (Plan brief 130)
// Detecta el patrón: `http.get<X[]>(this.apiBase, ...)` cuando `apiBase` apunta a un endpoint
// BE que devuelve `ApiResponse<PaginatedResult<X>>`. Tras el `apiResponseInterceptor`, el body
// es `{ data, page, pageSize, total }` (PaginatedResult), NO `X[]`. Tipar como array engaña al
// compilador y rompe en runtime cuando el caller hace `.filter(...)` sobre el wrapper.
//
// Manifest hardcoded — 5 endpoints actuales con `PaginatedResult<T>`. Agregar uno nuevo es una
// línea. Cuando crezca >15, migrar a JSON regenerado desde controllers C#.
const PAGINATED_ENDPOINTS = [
	'/api/sistema/email-outbox/defer-events',
	'/api/sistema/email-outbox/quarantine',
	'/api/sistema/email-outbox/domain-pauses',
	'/api/sistema/email-blacklist',
	'/api/sistema/usuarios/listar',
];

const apiShapePlugin = {
	rules: {
		'unwrap-paginated': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Prohibe tipar como array (T[] o Array<T>) un http.get cuyo endpoint BE devuelve ApiResponse<PaginatedResult<T>>. El body tras el apiResponseInterceptor es PaginatedResult<T>, no T[].',
				},
				messages: {
					arrayTypeOnPaginatedEndpoint:
						"Endpoint '{{endpoint}}' devuelve `ApiResponse<PaginatedResult<{{inner}}>>`. Tras el apiResponseInterceptor el body es `PaginatedResult<{{inner}}>`, no `{{inner}}[]`. Opciones: (a) tipar `http.get<PaginatedResult<{{inner}}>>(...)` y devolver el wrapper para que el caller lea `.data`; (b) tipar igual y agregar `.pipe(map(res => res.data ?? []))` para devolver `{{inner}}[]`. Ver `rules/pagination.md` § 'Variante A wrapper'.",
				},
				schema: [],
			},
			create(context) {
				const sourceCode = context.sourceCode ?? context.getSourceCode();
				const classStack = [];

				function extractStringFromInit(init) {
					if (!init) return null;
					if (init.type === 'Literal' && typeof init.value === 'string') return init.value;
					if (init.type === 'TemplateLiteral') {
						// Concatenar quasis (las expressions tipo ${env.apiUrl} se ignoran — solo nos
						// importa la parte literal del path para matchear el manifest).
						return init.quasis.map((q) => q.value.cooked || '').join('');
					}
					return null;
				}

				function findPaginatedApiBase(classNode) {
					const body = classNode.body?.body || [];
					for (const member of body) {
						if (member.type !== 'PropertyDefinition') continue;
						const keyName = member.key?.name;
						if (!keyName) continue;
						// Capturar `apiBase`, `apiUrl`, `baseUrl`, `apiBlacklist`, etc.
						if (!/^(api|base)\w*(Base|Url)$|^apiBase$|^apiUrl$/i.test(keyName)) continue;
						const path = extractStringFromInit(member.value);
						if (!path) continue;
						for (const endpoint of PAGINATED_ENDPOINTS) {
							if (path.includes(endpoint)) return { endpoint, propertyName: keyName };
						}
					}
					return null;
				}

				function getInnerArrayType(typeArg) {
					if (!typeArg) return null;
					// `X[]` → TSArrayType
					if (typeArg.type === 'TSArrayType') {
						return sourceCode.getText(typeArg.elementType);
					}
					// `Array<X>` → TSTypeReference
					if (
						typeArg.type === 'TSTypeReference' &&
						typeArg.typeName?.name === 'Array'
					) {
						const params = typeArg.typeArguments?.params || typeArg.typeParameters?.params;
						if (params?.[0]) return sourceCode.getText(params[0]);
					}
					return null;
				}

				function isThisProperty(node, propertyName) {
					return (
						node?.type === 'MemberExpression' &&
						node.object?.type === 'ThisExpression' &&
						node.property?.name === propertyName
					);
				}

				return {
					ClassDeclaration(node) {
						classStack.push({ node, match: findPaginatedApiBase(node) });
					},
					'ClassDeclaration:exit'() {
						classStack.pop();
					},
					ClassExpression(node) {
						classStack.push({ node, match: findPaginatedApiBase(node) });
					},
					'ClassExpression:exit'() {
						classStack.pop();
					},

					CallExpression(node) {
						const top = classStack[classStack.length - 1];
						if (!top || !top.match) return;

						// callee: this.http.get(...) — clase canónica del proyecto.
						const callee = node.callee;
						if (callee?.type !== 'MemberExpression') return;
						if (callee.property?.name !== 'get') return;
						const httpReceiver = callee.object;
						if (
							httpReceiver?.type !== 'MemberExpression' ||
							httpReceiver.property?.name !== 'http' ||
							httpReceiver.object?.type !== 'ThisExpression'
						) {
							return;
						}

						// Type argument <X[]> o <Array<X>>
						const typeArg =
							node.typeArguments?.params?.[0] ?? node.typeParameters?.params?.[0];
						const inner = getInnerArrayType(typeArg);
						if (!inner) return;

						// Filtro de precisión: el primer arg debe ser this.<apiBase> exactamente
						// (no `this.apiBase + '/' + id`). El manifest cubre el endpoint base, no
						// sub-rutas tipo `/{id}/release` que no paginan.
						const firstArg = node.arguments[0];
						if (!firstArg) return;
						if (!isThisProperty(firstArg, top.match.propertyName)) return;

						context.report({
							node: typeArg,
							messageId: 'arrayTypeOnPaginatedEndpoint',
							data: { endpoint: top.match.endpoint, inner },
						});
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
			{
				sourcePattern: /-api\.service(\.ts)?$/,
				message:
					'Components no deben importar *-api.service.ts directamente — consumir vía facade. G1 del inventario F3.1.',
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
	// Plan 50 F1 — core cannot import from features, shared, or intranet-shared.
	// Core is the lowest app layer; upward dependencies break the architecture.
	// Existing violations suppressed with `// DEBT: xrepo-50-F3a` — F3a moves files to fix them.
	{
		id: 'core-no-features',
		severity: 'error',
		match: (f) => /\/src\/app\/core\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@features\//,
				message:
					'core/ no puede importar de features/ — dependencia invertida. Mover el servicio a core/ o extraer interfaz. DEBT: xrepo-50-F3a.',
			},
			{
				sourcePattern: /^@intranet-shared(\/|$)/,
				message:
					'core/ no puede importar de @intranet-shared — dependencia invertida. Mover a core/ o shared/. DEBT: xrepo-50-F3a.',
			},
		],
	},
	{
		id: 'core-no-shared',
		severity: 'error',
		match: (f) => /\/src\/app\/core\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@shared\//,
				message:
					'core/ no puede importar de shared/ — dependencia invertida. Mover tipos a @data/ o helpers a @core/. DEBT: xrepo-50-F3a.',
			},
		],
	},
	// Barrel-only enforcement for @data/*. Consumers must import from @data/models or
	// @data/adapters, not from internal paths like @data/models/attendance.models.
	{
		id: 'data-models-barrel-only',
		severity: 'error',
		match: (f) =>
			!/\/src\/app\/data\/models\//.test(f) &&
			!/\/shared\/services\/attendance\/attendance\.models\.ts$/.test(f),
		restrictions: [
			{
				sourcePattern: /^@data\/models\/.+/,
				message:
					'Importar desde @data/models (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'data-adapters-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/data\/adapters\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@data\/adapters\/.+/,
				message:
					'Importar desde @data/adapters (barrel), no del path interno.',
			},
		],
	},
	// Barrel-only enforcement for @core/services/*. Consumers must import from the barrel
	// (@core/services/<group>), not from internal paths. The barrel defines the public API.
	// Plan 1 F5: storage, wal, session. Plan 50 F2a: remaining 19 groups.
	{
		id: 'auth-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/auth\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/auth\/.+/,
				message:
					'Importar desde @core/services/auth (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'cache-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/cache\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/cache\/.+/,
				message:
					'Importar desde @core/services/cache (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'capacitor-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/capacitor\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/capacitor\/.+/,
				message:
					'Importar desde @core/services/capacitor (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'destroy-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/destroy\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/destroy\/.+/,
				message:
					'Importar desde @core/services/destroy (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'error-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/error\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/error\/.+/,
				message:
					'Importar desde @core/services/error (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'excel-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/excel\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/excel\/.+/,
				message:
					'Importar desde @core/services/excel (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'facades-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/facades\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/facades\/.+/,
				message:
					'Importar desde @core/services/facades (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'feature-flags-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/feature-flags\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/feature-flags\/.+/,
				message:
					'Importar desde @core/services/feature-flags (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'feedback-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/feedback\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/feedback\/.+/,
				message:
					'Importar desde @core/services/feedback (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'http-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/http\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/http\/.+/,
				message:
					'Importar desde @core/services/http (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'keyboard-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/keyboard\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/keyboard\/.+/,
				message:
					'Importar desde @core/services/keyboard (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'modal-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/modal\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/modal\/.+/,
				message:
					'Importar desde @core/services/modal (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'notifications-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/notifications\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/notifications\/.+/,
				message:
					'Importar desde @core/services/notifications (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'permissions-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/permissions\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/permissions\/.+/,
				message:
					'Importar desde @core/services/permissions (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'rate-limit-countdown-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/rate-limit-countdown\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/rate-limit-countdown\/.+/,
				message:
					'Importar desde @core/services/rate-limit-countdown (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'signalr-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/signalr\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/signalr\/.+/,
				message:
					'Importar desde @core/services/signalr (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'speech-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/speech\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/speech\/.+/,
				message:
					'Importar desde @core/services/speech (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'storage-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/storage\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/storage\/.+/,
				message:
					'Importar desde @core/services/storage (barrel), no del path interno. Las impls (Session/Preferences/IndexedDB/etc) son privadas — usar StorageService.',
			},
		],
	},
	{
		id: 'trace-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/trace\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/trace\/.+/,
				message:
					'Importar desde @core/services/trace (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'user-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/user\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/user\/.+/,
				message:
					'Importar desde @core/services/user (barrel), no del path interno.',
			},
		],
	},
	{
		id: 'wal-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/wal\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/wal\/.+/,
				message:
					'Importar desde @core/services/wal (barrel), no del path interno. Las impls (WalService/Db/SyncEngine/Leader/etc) son privadas — usar WalFacadeHelper.',
			},
		],
	},
	{
		id: 'session-barrel-only',
		severity: 'error',
		match: (f) => !/\/src\/app\/core\/services\/session\//.test(f),
		restrictions: [
			{
				sourcePattern: /^@core\/services\/session\/.+/,
				message:
					'Importar desde @core/services/session (barrel), no del path interno. SessionCoordinator/SessionRefresh son privados — usar SessionActivityService.',
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
	// #region Global ignores — build artifacts y outputs generados
	// No son código fuente: nativos de Capacitor, coverage de Vitest, dist de build, node_modules.
	{
		ignores: [
			'android/**',
			'ios/**',
			'coverage/**',
			'dist/**',
			'.angular/**',
			'node_modules/**',
		],
	},
	// #endregion

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
		// server.ts: bootstrap SSR sin logger disponible en ese contexto
		files: [
			'src/app/core/helpers/logs/**/*.ts',
			'src/app/core/services/cache/**/*.ts',
			'src/server.ts',
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

	// #region api-shape — anti-pattern del unwrap doble en services FE (Plan brief 130)
	// Aplica a *.service.ts en features/ y shared/ y al gateway de core/services/permissions.
	// Tests excluidos.
	{
		files: [
			'src/app/features/**/*.service.ts',
			'src/app/shared/**/*.service.ts',
			'src/app/core/services/**/*.service.ts',
		],
		ignores: ['**/*.spec.ts'],
		plugins: {
			'api-shape': apiShapePlugin,
		},
		rules: {
			'api-shape/unwrap-paginated': 'error',
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
