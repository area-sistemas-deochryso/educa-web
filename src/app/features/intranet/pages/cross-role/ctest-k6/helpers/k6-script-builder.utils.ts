import type {
	K6Endpoint,
	K6Credential,
	K6RoleDistribution,
	K6TestConfig,
} from '../models';
import {
	pushImports,
	pushOptionsBlock,
	pushBaseUrl,
	pushCredentialsAndSetup,
	pushDefaultFunction,
	pushScenariosOptions,
	pushParamsHelper,
	pushUserAssignment,
	pushEndpointCalls,
	buildScenariosMeta,
} from './k6-script-sections.internal';

export { parseDurationToSec, formatSec } from './k6-script-sections.internal';

// #region API pública

/**
 * Genera un script k6 estándar (sin scenarios por fase).
 */
export function buildK6Script(
	config: K6TestConfig,
	endpoints: K6Endpoint[],
	credentials: K6Credential[],
	roleDistribution: K6RoleDistribution[],
): string {
	const lines: string[] = [];

	pushImports(lines, credentials.length > 0);
	pushOptionsBlock(lines, config);
	pushBaseUrl(lines, config.baseUrl);
	pushCredentialsAndSetup(lines, credentials, roleDistribution);
	pushDefaultFunction(lines, config, endpoints, credentials, roleDistribution);

	return lines.join('\n');
}

/**
 * Genera un script k6 con scenarios: cada fase tiene su propia función
 * con endpoints asignados y se ejecutan secuencialmente via startTime.
 */
export function buildK6ScenariosScript(
	config: K6TestConfig,
	allEndpoints: K6Endpoint[],
	credentials: K6Credential[],
	roleDistribution: K6RoleDistribution[],
): string {
	const lines: string[] = [];
	const hasAuth = credentials.length > 0;

	pushImports(lines, hasAuth);

	// Resolver endpoints por fase
	const phases = config.stages.map((stage, i) => {
		const eps =
			stage.endpointIndices.length > 0
				? stage.endpointIndices.filter((idx) => idx < allEndpoints.length).map((idx) => allEndpoints[idx])
				: allEndpoints;
		return { stage, eps, index: i };
	});

	// Calcular startTime acumulativo
	const scenarios = buildScenariosMeta(config.stages);

	pushScenariosOptions(lines, config, scenarios);
	pushBaseUrl(lines, config.baseUrl);
	pushCredentialsAndSetup(lines, credentials, roleDistribution);
	pushParamsHelper(lines, hasAuth);

	// Per-phase functions
	for (const phase of phases) {
		const fnName = `phase_${phase.index + 1}`;
		lines.push(`// Fase ${phase.index + 1}: ${phase.stage.duration} → ${phase.stage.target} VUs`);

		if (hasAuth) {
			lines.push(`export function ${fnName}(data) {`);
			pushUserAssignment(lines, roleDistribution, '  ');
			lines.push('  const cookieHeader = data.cookies[user.dni];');
			lines.push('  if (!cookieHeader) { sleep(30); return; }');
			lines.push('  const params = getParams(cookieHeader);');
		} else {
			lines.push(`export function ${fnName}() {`);
			lines.push('  const params = getParams();');
		}
		lines.push('');

		pushEndpointCalls(lines, phase.eps, config, '  ', hasAuth);

		lines.push('  sleep(Math.random() * 2 + 1);');
		lines.push('}');
		lines.push('');
	}

	return lines.join('\n').trimEnd();
}

// #endregion
