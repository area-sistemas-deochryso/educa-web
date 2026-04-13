import { Injectable, signal, computed } from '@angular/core';

import {
	K6TestConfig,
	K6Endpoint,
	K6Credential,
	K6Stage,
	K6RoleDistribution,
	TestType,
	HttpMethod,
	DEFAULT_CONFIG,
	TEST_TYPE_OPTIONS,
} from '../models';
import {
	parseDurationToSeconds,
	formatSecondsLabel,
	estimateRequests,
} from '../helpers/test-profile.helpers';

@Injectable({ providedIn: 'root' })
export class CTestK6Store {
	// #region Estado privado
	private readonly _config = signal<K6TestConfig>({ ...DEFAULT_CONFIG });
	private readonly _endpoints = signal<K6Endpoint[]>([]);
	private readonly _credentials = signal<K6Credential[]>([]);

	private readonly _roleDistribution = signal<K6RoleDistribution[]>([]);
	private readonly _bulkImportResult = signal<{ added: number; summary: string } | null>(null);

	private readonly _credentialsDialogVisible = signal(false);
	private readonly _loginLoading = signal(false);
	private readonly _loginError = signal<string | null>(null);
	private readonly _copied = signal(false);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly config = this._config.asReadonly();
	readonly endpoints = this._endpoints.asReadonly();
	readonly credentials = this._credentials.asReadonly();

	readonly roleDistribution = this._roleDistribution.asReadonly();
	readonly bulkImportResult = this._bulkImportResult.asReadonly();

	readonly credentialsDialogVisible = this._credentialsDialogVisible.asReadonly();
	readonly loginLoading = this._loginLoading.asReadonly();
	readonly loginError = this._loginError.asReadonly();
	readonly copied = this._copied.asReadonly();
	// #endregion

	// #region Computed
	readonly enabledEndpoints = computed(() => this._endpoints().filter((e) => e.enabled));

	readonly hasCredentials = computed(() => this._credentials().length > 0);

	readonly canGenerate = computed(
		() => this._config().baseUrl.trim() !== '' && this.enabledEndpoints().length > 0,
	);

	readonly endpointCount = computed(() => ({
		total: this._endpoints().length,
		enabled: this.enabledEndpoints().length,
	}));

	readonly credentialsSummary = computed(() =>
		this._credentials().map((c) => `${c.rol} (${c.usuario})`).join(', '),
	);

	readonly credentialsByRole = computed(() => {
		const creds = this._credentials();
		const groups = new Map<string, number>();
		for (const c of creds) {
			groups.set(c.rol, (groups.get(c.rol) ?? 0) + 1);
		}
		return Array.from(groups.entries()).map(([rol, count]) => ({ rol, count }));
	});

	readonly totalDistributionVUs = computed(() =>
		this._roleDistribution().reduce((sum, d) => sum + d.vus, 0),
	);

	readonly hasRoleDistribution = computed(() =>
		this._roleDistribution().length > 0 && this.totalDistributionVUs() > 0,
	);

	/** Indica si alguna fase tiene asignación de endpoints custom */
	readonly hasPerPhaseEndpoints = computed(() =>
		this._config().stages.some((s) => s.endpointIndices.length > 0),
	);

	/**
	 * Perfil del test: duración total, pico de VUs, fases visualizables.
	 * Parsea duraciones tipo "30s", "1m", "5m", "1h" a segundos.
	 */
	readonly testProfile = computed(() => {
		const config = this._config();
		const enabledCount = this.enabledEndpoints().length;

		if (config.useStages && config.stages.length > 0) {
			const phases = config.stages.map((s) => ({
				durationSec: parseDurationToSeconds(s.duration),
				durationLabel: s.duration,
				targetVus: s.target,
			}));
			const totalSec = phases.reduce((sum, p) => sum + p.durationSec, 0);
			const peakVus = Math.max(...phases.map((p) => p.targetVus));

			return {
				mode: 'stages' as const,
				phases,
				totalDuration: formatSecondsLabel(totalSec),
				totalDurationSec: totalSec,
				peakVus,
				endpointsCount: enabledCount,
				estimatedRequests: estimateRequests(phases, enabledCount),
			};
		}

		const totalSec = parseDurationToSeconds(config.duration);
		return {
			mode: 'fixed' as const,
			phases: [{ durationSec: totalSec, durationLabel: config.duration, targetVus: config.vus }],
			totalDuration: config.duration,
			totalDurationSec: totalSec,
			peakVus: config.vus,
			endpointsCount: enabledCount,
			estimatedRequests: Math.round((totalSec / 2) * config.vus * enabledCount),
		};
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		config: this._config(),
		endpoints: this._endpoints(),
		credentials: this._credentials(),
		enabledEndpoints: this.enabledEndpoints(),
		hasCredentials: this.hasCredentials(),
		canGenerate: this.canGenerate(),
		endpointCount: this.endpointCount(),
		credentialsSummary: this.credentialsSummary(),
		roleDistribution: this._roleDistribution(),
		credentialsByRole: this.credentialsByRole(),
		totalDistributionVUs: this.totalDistributionVUs(),
		hasRoleDistribution: this.hasRoleDistribution(),
		bulkImportResult: this._bulkImportResult(),

		testProfile: this.testProfile(),
		hasPerPhaseEndpoints: this.hasPerPhaseEndpoints(),

		credentialsDialogVisible: this._credentialsDialogVisible(),
		loginLoading: this._loginLoading(),
		loginError: this._loginError(),
		copied: this._copied(),
	}));
	// #endregion

	// #region Comandos de configuración
	updateConfigField<K extends keyof K6TestConfig>(field: K, value: K6TestConfig[K]): void {
		this._config.update((c) => ({ ...c, [field]: value }));
	}

	applyTestType(type: TestType): void {
		const preset = TEST_TYPE_OPTIONS.find((t) => t.value === type);
		if (!preset) return;

		this._config.update((c) => ({
			...c,
			testType: type,
			vus: preset.defaultVus,
			duration: preset.defaultDuration,
			stages: [...preset.defaultStages],
			useStages: true,
		}));
	}

	setBaseUrl(url: string): void {
		this._config.update((c) => ({ ...c, baseUrl: url }));
	}
	// #endregion

	// #region Comandos de stages
	addStage(): void {
		this._config.update((c) => ({
			...c,
			stages: [...c.stages, { duration: '30s', target: 50, endpointIndices: [] }],
		}));
	}

	removeStage(index: number): void {
		this._config.update((c) => ({
			...c,
			stages: c.stages.filter((_, i) => i !== index),
		}));
	}

	updateStage(index: number, field: keyof K6Stage, value: string | number): void {
		this._config.update((c) => ({
			...c,
			stages: c.stages.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
		}));
	}

	reorderStages(fromIndex: number, toIndex: number): void {
		this._config.update((c) => {
			const stages = [...c.stages];
			const [moved] = stages.splice(fromIndex, 1);
			stages.splice(toIndex, 0, moved);
			return { ...c, stages };
		});
	}

	updateStageEndpoints(stageIndex: number, endpointIndices: number[]): void {
		this._config.update((c) => ({
			...c,
			stages: c.stages.map((s, i) =>
				i === stageIndex ? { ...s, endpointIndices } : s,
			),
		}));
	}
	// #endregion

	// #region Comandos de endpoints
	setEndpoints(endpoints: K6Endpoint[]): void {
		this._endpoints.set(endpoints);
	}

	addEndpoint(): void {
		this._endpoints.update((list) => [
			...list,
			{ enabled: true, method: 'GET' as HttpMethod, path: '', body: '', name: '' },
		]);
	}

	removeEndpoint(index: number): void {
		this._endpoints.update((list) => list.filter((_, i) => i !== index));
	}

	updateEndpoint(index: number, field: keyof K6Endpoint, value: unknown): void {
		this._endpoints.update((list) =>
			list.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
		);
	}

	toggleEndpoint(index: number): void {
		this._endpoints.update((list) =>
			list.map((e, i) => (i === index ? { ...e, enabled: !e.enabled } : e)),
		);
	}

	toggleAllEndpoints(enabled: boolean): void {
		this._endpoints.update((list) => list.map((e) => ({ ...e, enabled })));
	}

	reorderEndpoints(fromIndex: number, toIndex: number): void {
		this._endpoints.update((list) => {
			const copy = [...list];
			const [moved] = copy.splice(fromIndex, 1);
			copy.splice(toIndex, 0, moved);
			return copy;
		});
	}
	// #endregion

	// #region Comandos de credenciales
	addCredential(credential: K6Credential): void {
		this._credentials.update((list) => [
			...list.filter((c) => c.usuario !== credential.usuario),
			credential,
		]);
	}

	removeCredential(usuario: string): void {
		this._credentials.update((list) => list.filter((c) => c.usuario !== usuario));
	}

	setLoginLoading(loading: boolean): void {
		this._loginLoading.set(loading);
	}

	setLoginError(error: string | null): void {
		this._loginError.set(error);
	}

	addCredentialsBulk(credentials: K6Credential[]): void {
		this._credentials.update((list) => {
			const existing = new Map(list.map((c) => [c.usuario, c]));
			for (const cred of credentials) {
				existing.set(cred.usuario, cred);
			}
			return Array.from(existing.values());
		});
	}

	clearCredentials(): void {
		this._credentials.set([]);
		this._roleDistribution.set([]);
	}

	setRoleDistribution(distribution: K6RoleDistribution[]): void {
		this._roleDistribution.set(distribution);
	}

	updateRoleVUs(rol: string, vus: number): void {
		this._roleDistribution.update((dist) =>
			dist.map((d) => (d.rol === rol ? { ...d, vus } : d)),
		);
	}

	setBulkImportResult(result: { added: number; summary: string } | null): void {
		this._bulkImportResult.set(result);
	}

	/** Genera distribucion proporcional de VUs segun credenciales por rol */
	autoDistributeRoles(totalVUs: number): void {
		const byRole = this.credentialsByRole();
		if (byRole.length === 0) {
			this._roleDistribution.set([]);
			return;
		}
		const totalCreds = byRole.reduce((sum, r) => sum + r.count, 0);
		let remaining = totalVUs;
		const dist: K6RoleDistribution[] = [];
		for (let i = 0; i < byRole.length; i++) {
			const isLast = i === byRole.length - 1;
			const vus = isLast ? remaining : Math.max(Math.round((byRole[i].count / totalCreds) * totalVUs), 1);
			dist.push({ rol: byRole[i].rol, vus });
			remaining -= vus;
		}
		this._roleDistribution.set(dist);
	}
	// #endregion

	// #region Comandos de UI
	openCredentialsDialog(): void {
		this._credentialsDialogVisible.set(true);
		this._loginError.set(null);
	}

	closeCredentialsDialog(): void {
		this._credentialsDialogVisible.set(false);
		this._loginError.set(null);
	}

	setCopied(copied: boolean): void {
		this._copied.set(copied);
	}
	// #endregion

}
