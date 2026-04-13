import type {
	K6Endpoint,
	K6Credential,
	K6RoleDistribution,
	K6Stage,
	K6TestConfig,
} from '../models';
import { pushSetupFunction, pushRoleArraysAndRanges } from './k6-auth-setup.internal';

export interface ScenarioMeta {
	name: string;
	stage: K6Stage;
	startTime: number;
	prevTarget: number;
}

// #region Bloques comunes

export function pushImports(lines: string[], hasAuth: boolean): void {
	lines.push(`import http from 'k6/http';`);
	lines.push(`import { check, sleep } from 'k6';`);
	if (hasAuth) {
		lines.push(`import exec from 'k6/execution';`);
	}
	lines.push('');
}

export function pushBaseUrl(lines: string[], baseUrl: string): void {
	lines.push(`const BASE_URL = '${baseUrl}';`);
	lines.push('');
}

export function pushOptionsBlock(lines: string[], config: K6TestConfig): void {
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
	pushTlsAndThresholds(lines, config);
	lines.push('};');
	lines.push('');
}

export function pushScenariosOptions(
	lines: string[],
	config: K6TestConfig,
	scenarios: ScenarioMeta[],
): void {
	lines.push('export const options = {');
	lines.push('  scenarios: {');
	for (const sc of scenarios) {
		lines.push(`    ${sc.name}: {`);
		lines.push(`      executor: 'ramping-vus',`);
		lines.push(`      startVUs: ${sc.prevTarget},`);
		lines.push(`      stages: [{ duration: '${sc.stage.duration}', target: ${sc.stage.target} }],`);
		if (sc.startTime > 0) {
			lines.push(`      startTime: '${formatSec(sc.startTime)}',`);
		}
		lines.push(`      exec: '${sc.name}',`);
		lines.push('    },');
	}
	lines.push('  },');
	pushTlsAndThresholds(lines, config);
	lines.push('};');
	lines.push('');
}

function pushTlsAndThresholds(lines: string[], config: K6TestConfig): void {
	if (config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1')) {
		lines.push('  insecureSkipTLSVerify: true,');
	}
	lines.push('  thresholds: {');
	lines.push(`    http_req_duration: ['p(95)<${config.thresholds.p95Latency}'],`);
	lines.push(
		`    http_req_failed: ['rate<${(config.thresholds.errorRate / 100).toFixed(2)}'],`,
	);
	lines.push('  },');
}

export function pushCredentialsAndSetup(
	lines: string[],
	credentials: K6Credential[],
	roleDistribution: K6RoleDistribution[],
): void {
	if (credentials.length === 0) return;

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
		pushRoleArraysAndRanges(lines, roleDistribution);
	}

	pushSetupFunction(lines);
}

export function pushParamsHelper(lines: string[], hasAuth: boolean): void {
	if (hasAuth) {
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
}

export function pushDefaultFunction(
	lines: string[],
	config: K6TestConfig,
	endpoints: K6Endpoint[],
	credentials: K6Credential[],
	roleDistribution: K6RoleDistribution[],
): void {
	const hasAuth = credentials.length > 0;

	if (hasAuth) {
		lines.push('export default function (data) {');
		pushUserAssignment(lines, roleDistribution, '  ');
		lines.push('  const cookieHeader = data.cookies[user.dni];');
		lines.push('  if (!cookieHeader) { sleep(30); return; } // Login falló en setup, esperar para no spin-loop');
	} else {
		lines.push('export default function () {');
	}
	lines.push('');
	lines.push('  const params = {');
	lines.push('    headers: {');
	lines.push(`      'Content-Type': 'application/json',`);
	if (hasAuth) {
		lines.push("      'Cookie': cookieHeader,");
	}
	lines.push('    },');
	lines.push('  };');
	lines.push('');

	pushEndpointCalls(lines, endpoints, config, '  ', hasAuth);

	lines.push('  // Pausa entre iteraciones (simula tiempo de lectura del usuario)');
	lines.push('  sleep(Math.random() * 2 + 1);');
	lines.push('}');
}

// #endregion
// #region Endpoints

function detectEndpointRole(ep: K6Endpoint): string | null {
	const lower = (ep.path + ' ' + ep.name).toLowerCase();
	if (lower.includes('/estudiante') || lower.includes('estudiante-')) return 'Estudiante';
	if (lower.includes('/profesor') || lower.includes('profesor-')) return 'Profesor';
	if (lower.includes('/director') || lower.includes('director-') || lower.includes('/sistema/')) return 'Director';
	return null;
}

export function pushEndpointCalls(
	lines: string[],
	endpoints: K6Endpoint[],
	config: K6TestConfig,
	indent: string,
	hasAuth: boolean,
): void {
	const commonEps: { ep: K6Endpoint; idx: number }[] = [];
	const roleGroups = new Map<string, { ep: K6Endpoint; idx: number }[]>();

	for (let i = 0; i < endpoints.length; i++) {
		const ep = endpoints[i];
		const role = hasAuth ? detectEndpointRole(ep) : null;
		if (role) {
			if (!roleGroups.has(role)) roleGroups.set(role, []);
			roleGroups.get(role)!.push({ ep, idx: i });
		} else {
			commonEps.push({ ep, idx: i });
		}
	}

	let varCounter = 0;

	for (const { ep } of commonEps) {
		varCounter++;
		pushSingleEndpointCall(lines, ep, `res${varCounter}`, config, indent);
	}

	for (const [role, eps] of roleGroups) {
		lines.push(`${indent}if (user.rol === '${role}') {`);
		for (const { ep } of eps) {
			varCounter++;
			pushSingleEndpointCall(lines, ep, `res${varCounter}`, config, `${indent}  `);
		}
		lines.push(`${indent}}`);
		lines.push('');
	}
}

function pushSingleEndpointCall(
	lines: string[],
	ep: K6Endpoint,
	varName: string,
	config: K6TestConfig,
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

// #endregion
// #region Auth y roles

export function pushUserAssignment(lines: string[], roleDistribution: K6RoleDistribution[], indent: string): void {
	if (roleDistribution.length > 0) {
		lines.push(`${indent}const user = getUser(exec.vu.idInTest);`);
	} else {
		lines.push(`${indent}const user = USERS[exec.vu.idInTest % USERS.length];`);
	}
}

// #endregion
// #region Utilidades

export function buildScenariosMeta(stages: K6Stage[]): ScenarioMeta[] {
	const scenarios: ScenarioMeta[] = [];
	let cumulativeSec = 0;
	let prevTarget = 0;

	for (let i = 0; i < stages.length; i++) {
		scenarios.push({
			name: `phase_${i + 1}`,
			stage: stages[i],
			startTime: cumulativeSec,
			prevTarget,
		});
		prevTarget = stages[i].target;
		cumulativeSec += parseDurationToSec(stages[i].duration);
	}

	return scenarios;
}

/** Parsea una duración k6 ("30s", "2m", "1h") a segundos. */
export function parseDurationToSec(duration: string): number {
	const match = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)$/i);
	if (!match) return 0;
	const value = parseFloat(match[1]);
	const unit = match[2].toLowerCase();
	if (unit === 'h') return value * 3600;
	if (unit === 'm') return value * 60;
	return value;
}

/** Formatea segundos a duración k6. */
export function formatSec(sec: number): string {
	if (sec < 60) return `${sec}s`;
	if (sec % 60 === 0) return `${sec / 60}m`;
	return `${sec}s`;
}
// #endregion
