import { Injectable, inject, computed, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';

import { CTestK6Store } from './ctest-k6.store';
import {
	K6Endpoint,
	K6Credential,
	K6RoleDistribution,
	K6Stage,
	TestType,
	PRESET_ENDPOINTS,
	EDUCA_REAL_DISTRIBUTION,
	LOGIN_ROLE_OPTIONS,
} from '../models';

// #region Interfaces
interface LoginResponse {
	success: boolean;
	token: string;
	rol: string;
	nombreCompleto: string;
	entityId: number;
	sedeId: number;
	mensaje: string;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class CTestK6Facade {
	// #region Dependencias
	private readonly http = inject(HttpClient);
	private readonly store = inject(CTestK6Store);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Computed — Script generado
	readonly generatedScript = computed(() => {
		const vm = this.vm();
		if (!vm.canGenerate) return '// Configure al menos una URL base y un endpoint habilitado';

		const dist = vm.hasRoleDistribution ? vm.roleDistribution : [];
		if (vm.hasPerPhaseEndpoints && vm.config.useStages) {
			return this.buildScenariosScript(vm.config, vm.enabledEndpoints, vm.credentials, dist);
		}
		return this.buildScript(vm.config, vm.enabledEndpoints, vm.credentials, dist);
	});
	// #endregion

	// #region Comandos de configuración
	applyTestType(type: TestType): void {
		this.store.applyTestType(type);
	}

	loadPresetEndpoints(): void {
		const allEndpoints: K6Endpoint[] = PRESET_ENDPOINTS.flatMap((p) => p.endpoints);
		this.store.setEndpoints(allEndpoints);
	}

	addCustomEndpoint(): void {
		this.store.addEndpoint();
	}
	// #endregion

	// #region Comandos de credenciales
	/**
	 * Login real al API: POST { dni, contraseña, rol, rememberMe }
	 * Guarda token + credenciales para el script k6
	 */
	testLogin(dni: string, password: string, rol: string, endpoint: string): void {
		this.store.setLoginLoading(true);
		this.store.setLoginError(null);

		this.http
			.post<LoginResponse>(endpoint, {
				dni,
				contraseña: password,
				rol,
				rememberMe: false,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					if (!response.success) {
						this.store.setLoginError(response.mensaje || 'Login fallido');
						this.store.setLoginLoading(false);
						return;
					}

					const credential: K6Credential = {
						usuario: dni,
						password,
						token: response.token,
						rol: response.rol ?? rol,
						nombre: response.nombreCompleto ?? dni,
					};
					this.store.addCredential(credential);
					this.store.autoDistributeRoles(this.getPeakVUs());
					this.store.setLoginLoading(false);
					logger.log(`[CTestK6] Login exitoso: ${credential.rol} (${dni})`);
				},
				error: (err) => {
					const mensaje =
						err?.error?.mensaje ?? err?.error?.message ?? 'Error de autenticación';
					this.store.setLoginError(mensaje);
					this.store.setLoginLoading(false);
					logger.warn('[CTestK6] Login fallido:', mensaje);
				},
			});
	}
	// #endregion

	// #region Comandos de credenciales — Bulk
	parseBulkCredentials(text: string): { valid: K6Credential[]; errors: string[] } {
		const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
		const valid: K6Credential[] = [];
		const errors: string[] = [];
		const validRoles = new Set(LOGIN_ROLE_OPTIONS.map((r) => r.value));

		for (let i = 0; i < lines.length; i++) {
			const parts = lines[i].split(',').map((p) => p.trim());
			if (parts.length < 3) {
				errors.push(`Linea ${i + 1}: formato invalido (esperado: dni,password,rol)`);
				continue;
			}
			const [dni, password, rol] = parts;
			if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
				errors.push(`Linea ${i + 1}: DNI invalido "${dni}" (debe ser 8 digitos)`);
				continue;
			}
			if (!password) {
				errors.push(`Linea ${i + 1}: password vacio`);
				continue;
			}
			if (!validRoles.has(rol)) {
				errors.push(`Linea ${i + 1}: rol invalido "${rol}"`);
				continue;
			}
			valid.push({ usuario: dni, password, token: '', rol, nombre: dni });
		}
		return { valid, errors };
	}

	importBulkCredentials(text: string): void {
		const { valid, errors } = this.parseBulkCredentials(text);
		if (valid.length > 0) {
			this.store.addCredentialsBulk(valid);
			const peakVUs = this.getPeakVUs();
			this.store.autoDistributeRoles(peakVUs);
		}

		const roleCounts = new Map<string, number>();
		for (const c of valid) {
			roleCounts.set(c.rol, (roleCounts.get(c.rol) ?? 0) + 1);
		}
		const summary = Array.from(roleCounts.entries())
			.map(([rol, count]) => `${count} ${rol}`)
			.join(', ');

		const errorSuffix = errors.length > 0 ? ` | ${errors.length} errores` : '';
		this.store.setBulkImportResult({
			added: valid.length,
			summary: valid.length > 0
				? `${valid.length} credenciales importadas (${summary})${errorSuffix}`
				: `Ninguna credencial valida encontrada${errorSuffix}`,
		});

		if (errors.length > 0) {
			logger.warn('[CTestK6] Errores de parsing bulk:', errors);
		}
	}

	clearAllCredentials(): void {
		this.store.clearCredentials();
		this.store.setBulkImportResult(null);
	}

	applyPresetDistribution(): void {
		this.store.setRoleDistribution([...EDUCA_REAL_DISTRIBUTION]);
	}

	clearBulkImportResult(): void {
		this.store.setBulkImportResult(null);
	}

	private getPeakVUs(): number {
		const config = this.store.config();
		if (config.useStages && config.stages.length > 0) {
			return Math.max(...config.stages.map((s) => s.target));
		}
		return config.vus;
	}
	// #endregion

	// #region Comandos de UI — Dialog
	openCredentialsDialog(): void {
		this.store.openCredentialsDialog();
	}

	closeCredentialsDialog(): void {
		this.store.closeCredentialsDialog();
	}
	// #endregion

	// #region Comandos de exportación
	async copyToClipboard(): Promise<void> {
		try {
			await navigator.clipboard.writeText(this.generatedScript());
			this.store.setCopied(true);
			setTimeout(() => this.store.setCopied(false), 2000);
		} catch {
			logger.warn('[CTestK6] No se pudo copiar al clipboard');
		}
	}

	downloadScript(): void {
		const config = this.store.config();
		const blob = new Blob([this.generatedScript()], { type: 'application/javascript' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${config.testName || 'k6-test'}.js`;
		a.click();
		URL.revokeObjectURL(url);
	}
	// #endregion

	// #region Helpers privados — Generación del script k6
	private buildScript(
		config: ReturnType<typeof this.store.config>,
		endpoints: K6Endpoint[],
		credentials: K6Credential[],
		roleDistribution: K6RoleDistribution[],
	): string {
		const lines: string[] = [];

		lines.push(`import http from 'k6/http';`);
		lines.push(`import { check, sleep } from 'k6';`);
		if (credentials.length > 0) {
			lines.push(`import exec from 'k6/execution';`);
		}
		lines.push('');

		// Options
		lines.push('export const options = {');
		if (config.useStages && config.stages.length > 0) {
			lines.push('  stages: [');
			for (const stage of config.stages) {
				lines.push(`    { duration: '${stage.duration}', target: ${stage.target} },`);
			}
			lines.push('  ],');
		} else {
			lines.push(`  vus: ${config.vus},`);
			lines.push(`  duration: '${config.duration}',`);
		}
		// TLS: confiar en certificados auto-firmados (localhost)
		if (config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1')) {
			lines.push('  insecureSkipTLSVerify: true,');
		}
		lines.push('  thresholds: {');
		lines.push(`    http_req_duration: ['p(95)<${config.thresholds.p95Latency}'],`);
		lines.push(
			`    http_req_failed: ['rate<${(config.thresholds.errorRate / 100).toFixed(2)}'],`,
		);
		lines.push('  },');
		lines.push('};');
		lines.push('');

		// Base URL
		lines.push(`const BASE_URL = '${config.baseUrl}';`);
		lines.push('');

		// Credenciales y setup de login
		if (credentials.length > 0) {
			lines.push('// Credenciales para login (DNI + contraseña + rol)');
			lines.push('const USERS = [');
			for (const cred of credentials) {
				lines.push(
					`  { dni: '${cred.usuario}', password: '${cred.password}', rol: '${cred.rol}' },`,
				);
			}
			lines.push('];');
			lines.push('');

			if (roleDistribution.length > 0) {
				this.generateRoleArraysAndRanges(lines, roleDistribution);
			}

			this.generateSetupFunction(lines);
		}

		// Default function
		if (credentials.length > 0) {
			lines.push('export default function (data) {');
			this.generateUserAssignment(lines, roleDistribution, '  ');
			lines.push('  const cookieHeader = data.cookies[user.dni];');
			lines.push('  if (!cookieHeader) { sleep(30); return; } // Login falló en setup, esperar para no spin-loop');
		} else {
			lines.push('export default function () {');
		}
		lines.push('');
		lines.push('  const params = {');
		lines.push('    headers: {');
		lines.push(`      'Content-Type': 'application/json',`);
		if (credentials.length > 0) {
			lines.push("      'Cookie': cookieHeader,");
		}
		lines.push('    },');
		lines.push('  };');
		lines.push('');

		// Endpoints (agrupados por rol para evitar cross-role failures)
		const hasAuth = credentials.length > 0;
		this.generateEndpointCalls(lines, endpoints, config, '  ', hasAuth);

		lines.push('  // Pausa entre iteraciones (simula tiempo de lectura del usuario)');
		lines.push('  sleep(Math.random() * 2 + 1);');
		lines.push('}');

		return lines.join('\n');
	}

	/**
	 * Genera script con k6 scenarios: cada fase tiene su propia función
	 * con sus endpoints asignados y se ejecutan secuencialmente via startTime.
	 */
	private buildScenariosScript(
		config: ReturnType<typeof this.store.config>,
		allEndpoints: K6Endpoint[],
		credentials: K6Credential[],
		roleDistribution: K6RoleDistribution[],
	): string {
		const lines: string[] = [];

		lines.push(`import http from 'k6/http';`);
		lines.push(`import { check, sleep } from 'k6';`);
		if (credentials.length > 0) {
			lines.push(`import exec from 'k6/execution';`);
		}
		lines.push('');

		// Calcular startTime acumulativo y resolver endpoints por fase
		const phases = config.stages.map((stage, i) => {
			const eps =
				stage.endpointIndices.length > 0
					? stage.endpointIndices.filter((idx) => idx < allEndpoints.length).map((idx) => allEndpoints[idx])
					: allEndpoints;
			return { stage, eps, index: i };
		});

		// startTime acumulativo (parsear durations)
		let cumulativeSec = 0;
		const scenarios: { name: string; stage: K6Stage; startTime: number; prevTarget: number }[] = [];
		let prevTarget = 0;
		for (const phase of phases) {
			scenarios.push({
				name: `phase_${phase.index + 1}`,
				stage: phase.stage,
				startTime: cumulativeSec,
				prevTarget,
			});
			prevTarget = phase.stage.target;
			cumulativeSec += this.parseDurationToSec(phase.stage.duration);
		}

		// Options con scenarios
		lines.push('export const options = {');
		lines.push('  scenarios: {');
		for (const sc of scenarios) {
			lines.push(`    ${sc.name}: {`);
			lines.push(`      executor: 'ramping-vus',`);
			lines.push(`      startVUs: ${sc.prevTarget},`);
			lines.push(`      stages: [{ duration: '${sc.stage.duration}', target: ${sc.stage.target} }],`);
			if (sc.startTime > 0) {
				lines.push(`      startTime: '${this.formatSec(sc.startTime)}',`);
			}
			lines.push(`      exec: '${sc.name}',`);
			lines.push('    },');
		}
		lines.push('  },');
		// TLS: confiar en certificados auto-firmados (localhost)
		if (config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1')) {
			lines.push('  insecureSkipTLSVerify: true,');
		}
		lines.push('  thresholds: {');
		lines.push(`    http_req_duration: ['p(95)<${config.thresholds.p95Latency}'],`);
		lines.push(
			`    http_req_failed: ['rate<${(config.thresholds.errorRate / 100).toFixed(2)}'],`,
		);
		lines.push('  },');
		lines.push('};');
		lines.push('');

		// Base URL
		lines.push(`const BASE_URL = '${config.baseUrl}';`);
		lines.push('');

		// Credentials y setup
		if (credentials.length > 0) {
			lines.push('const USERS = [');
			for (const cred of credentials) {
				lines.push(
					`  { dni: '${cred.usuario}', password: '${cred.password}', rol: '${cred.rol}' },`,
				);
			}
			lines.push('];');
			lines.push('');

			if (roleDistribution.length > 0) {
				this.generateRoleArraysAndRanges(lines, roleDistribution);
			}

			this.generateSetupFunction(lines);
		}

		// Helper: params builder
		if (credentials.length > 0) {
			lines.push('function getParams(cookieHeader) {');
			lines.push('  return {');
			lines.push('    headers: {');
			lines.push("      'Content-Type': 'application/json',");
			lines.push("      'Cookie': cookieHeader,");
			lines.push('    },');
			lines.push('  };');
			lines.push('}');
		} else {
			lines.push('function getParams() {');
			lines.push('  return {');
			lines.push('    headers: {');
			lines.push("      'Content-Type': 'application/json',");
			lines.push('    },');
			lines.push('  };');
			lines.push('}');
		}
		lines.push('');

		// Per-phase functions
		const hasAuth = credentials.length > 0;
		for (const phase of phases) {
			const fnName = `phase_${phase.index + 1}`;
			lines.push(`// Fase ${phase.index + 1}: ${phase.stage.duration} → ${phase.stage.target} VUs`);
			if (hasAuth) {
				lines.push(`export function ${fnName}(data) {`);
				this.generateUserAssignment(lines, roleDistribution, '  ');
				lines.push('  const cookieHeader = data.cookies[user.dni];');
				lines.push('  if (!cookieHeader) { sleep(30); return; }');
				lines.push('  const params = getParams(cookieHeader);');
			} else {
				lines.push(`export function ${fnName}() {`);
				lines.push('  const params = getParams();');
			}
			lines.push('');

			this.generateEndpointCalls(lines, phase.eps, config, '  ', hasAuth);

			lines.push('  sleep(Math.random() * 2 + 1);');
			lines.push('}');
			lines.push('');
		}

		return lines.join('\n').trimEnd();
	}

	/**
	 * Detecta el rol requerido por un endpoint según su path y nombre.
	 * Convención API: /api/Estudiante/*, /api/EstudianteCurso/*,
	 * /api/.../estudiante/..., o nombre que empieza con "estudiante-".
	 */
	private detectEndpointRole(ep: K6Endpoint): string | null {
		const lower = (ep.path + ' ' + ep.name).toLowerCase();
		if (lower.includes('/estudiante') || lower.includes('estudiante-')) return 'Estudiante';
		if (lower.includes('/profesor') || lower.includes('profesor-')) return 'Profesor';
		if (lower.includes('/director') || lower.includes('director-') || lower.includes('/sistema/')) return 'Director';
		return null;
	}

	/**
	 * Genera las llamadas a endpoints en el script k6, agrupando por rol
	 * para que cada VU solo ejecute endpoints de su propio rol.
	 */
	private generateEndpointCalls(
		lines: string[],
		endpoints: K6Endpoint[],
		config: ReturnType<typeof this.store.config>,
		indent: string,
		hasAuth: boolean,
	): void {
		// Separar endpoints por rol
		const commonEps: { ep: K6Endpoint; idx: number }[] = [];
		const roleGroups = new Map<string, { ep: K6Endpoint; idx: number }[]>();

		for (let i = 0; i < endpoints.length; i++) {
			const ep = endpoints[i];
			const role = hasAuth ? this.detectEndpointRole(ep) : null;
			if (role) {
				if (!roleGroups.has(role)) roleGroups.set(role, []);
				roleGroups.get(role)!.push({ ep, idx: i });
			} else {
				commonEps.push({ ep, idx: i });
			}
		}

		let varCounter = 0;

		// Endpoints comunes (sin restricción de rol)
		for (const { ep } of commonEps) {
			varCounter++;
			this.pushEndpointCall(lines, ep, `res${varCounter}`, config, indent);
		}

		// Endpoints específicos por rol, envueltos en if (user.rol === 'X')
		for (const [role, eps] of roleGroups) {
			lines.push(`${indent}if (user.rol === '${role}') {`);
			for (const { ep } of eps) {
				varCounter++;
				this.pushEndpointCall(lines, ep, `res${varCounter}`, config, `${indent}  `);
			}
			lines.push(`${indent}}`);
			lines.push('');
		}
	}

	private pushEndpointCall(
		lines: string[],
		ep: K6Endpoint,
		varName: string,
		config: ReturnType<typeof this.store.config>,
		indent: string,
	): void {
		const checkName = ep.name || varName;

		if (ep.method === 'GET' || ep.method === 'DELETE') {
			lines.push(
				`${indent}const ${varName} = http.${ep.method.toLowerCase()}(\`\${BASE_URL}${ep.path}\`, params);`,
			);
		} else {
			const bodyStr = ep.body?.trim()
				? `JSON.stringify(${ep.body.trim()})`
				: `JSON.stringify({})`;
			lines.push(
				`${indent}const ${varName} = http.${ep.method.toLowerCase()}(\`\${BASE_URL}${ep.path}\`, ${bodyStr}, params);`,
			);
		}
		lines.push(`${indent}if (${varName}.status !== 200) console.warn('[VU ' + exec.vu.idInTest + '] ${checkName} → ' + ${varName}.status + ' (' + ${varName}.body.substring(0, 120) + ')');`);
		lines.push(`${indent}check(${varName}, {`);
		lines.push(`${indent}  '${checkName} status 200': (r) => r.status === 200,`);
		lines.push(
			`${indent}  '${checkName} < ${config.thresholds.p95Latency}ms': (r) => r.timings.duration < ${config.thresholds.p95Latency},`,
		);
		lines.push(`${indent}});`);
		lines.push('');
	}

	private parseDurationToSec(duration: string): number {
		const match = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)$/i);
		if (!match) return 0;
		const value = parseFloat(match[1]);
		const unit = match[2].toLowerCase();
		if (unit === 'h') return value * 3600;
		if (unit === 'm') return value * 60;
		return value;
	}

	private formatSec(sec: number): string {
		if (sec < 60) return `${sec}s`;
		if (sec % 60 === 0) return `${sec / 60}m`;
		return `${sec}s`;
	}

	/** Genera setup() con login + retry + cookies — reutilizado por ambos builders */
	private generateSetupFunction(lines: string[]): void {
		lines.push('// setup() corre UNA vez antes de todos los VUs — login sin rate-limit');
		lines.push('export function setup() {');
		lines.push('  const cookies = {};');
		lines.push('  for (const user of USERS) {');
		lines.push('    for (let attempt = 1; attempt <= 3; attempt++) {');
		lines.push('      const loginRes = http.post(');
		lines.push('        `${BASE_URL}/api/Auth/login`,');
		lines.push("        JSON.stringify({ dni: user.dni, contraseña: user.password, rol: user.rol, rememberMe: false }),");
		lines.push("        { headers: { 'Content-Type': 'application/json' } },");
		lines.push('      );');
		lines.push('      if (loginRes.status === 200 && loginRes.cookies) {');
		lines.push('        cookies[user.dni] = Object.entries(loginRes.cookies)');
		lines.push("          .map(([name, vals]) => `${name}=${vals[0].value}`)");
		lines.push("          .join('; ');");
		lines.push("        check(loginRes, { [`login ${user.rol} (${user.dni}) OK`]: () => true });");
		lines.push('        break;');
		lines.push('      }');
		lines.push("      console.warn(`[setup] login ${user.dni} attempt ${attempt} → ${loginRes.status}`);");
		lines.push('      sleep(3 * attempt);');
		lines.push('    }');
		lines.push('    sleep(2);');
		lines.push('  }');
		lines.push('  const ok = Object.keys(cookies).length;');
		lines.push('  console.log(`[setup] ${ok}/${USERS.length} logins OK — cookies: ${JSON.stringify(Object.keys(cookies))}`);');
		lines.push('  if (ok === 0) { console.error("[setup] NINGÚN login exitoso — abortando"); }');
		lines.push('  return { cookies };');
		lines.push('}');
		lines.push('');
	}

	/** Genera VU_RANGES + getUser() para distribucion proporcional por rol */
	private generateRoleArraysAndRanges(lines: string[], roleDistribution: K6RoleDistribution[]): void {
		lines.push('// Pool de credenciales por rol');
		for (const dist of roleDistribution) {
			const varName = this.roleToVarName(dist.rol);
			lines.push(`const ${varName} = USERS.filter(u => u.rol === '${dist.rol}');`);
		}
		lines.push('');
		lines.push('// Rangos de VU por rol (exec.vu.idInTest es 1-based en k6)');
		lines.push('const VU_RANGES = [');
		let cumulative = 0;
		for (const dist of roleDistribution) {
			cumulative += dist.vus;
			const varName = this.roleToVarName(dist.rol);
			lines.push(`  { maxVU: ${cumulative}, creds: ${varName}, rol: '${dist.rol}' },`);
		}
		lines.push('];');
		lines.push('');
		lines.push('function getUser(vuId) {');
		lines.push('  let prev = 0;');
		lines.push('  for (const range of VU_RANGES) {');
		lines.push('    if (vuId <= range.maxVU && range.creds.length > 0) {');
		lines.push('      const idx = (vuId - prev - 1) % range.creds.length;');
		lines.push('      return { ...range.creds[idx], rol: range.rol };');
		lines.push('    }');
		lines.push('    prev = range.maxVU;');
		lines.push('  }');
		lines.push('  return USERS[0]; // fallback');
		lines.push('}');
		lines.push('');
	}

	/** Genera asignacion de usuario: proporcional o round-robin */
	private generateUserAssignment(lines: string[], roleDistribution: K6RoleDistribution[], indent: string): void {
		if (roleDistribution.length > 0) {
			lines.push(`${indent}const user = getUser(exec.vu.idInTest);`);
		} else {
			lines.push(`${indent}const user = USERS[exec.vu.idInTest % USERS.length];`);
		}
	}

	private roleToVarName(rol: string): string {
		const map: Record<string, string> = {
			Estudiante: 'ESTUDIANTES',
			Profesor: 'PROFESORES',
			Director: 'DIRECTORES',
			'Asistente Administrativo': 'ADMINS',
			Apoderado: 'APODERADOS',
		};
		return map[rol] ?? rol.toUpperCase().replace(/\s+/g, '_') + 'S';
	}
	// #endregion
}
