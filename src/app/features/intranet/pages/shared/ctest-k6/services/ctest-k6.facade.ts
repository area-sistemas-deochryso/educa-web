import { Injectable, inject, computed, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger, extractErrorMessage } from '@core/helpers';

import { CTestK6Store } from './ctest-k6.store';
import {
	K6Credential,
	PRESET_ENDPOINTS,
	EDUCA_REAL_DISTRIBUTION,
	LOGIN_ROLE_OPTIONS,
	TestType,
} from '../models';
import { buildK6Script, buildK6ScenariosScript } from '../helpers/k6-script-builder.utils';

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
			return buildK6ScenariosScript(vm.config, vm.enabledEndpoints, vm.credentials, dist);
		}
		return buildK6Script(vm.config, vm.enabledEndpoints, vm.credentials, dist);
	});
	// #endregion

	// #region Comandos de configuración
	applyTestType(type: TestType): void {
		this.store.applyTestType(type);
	}

	loadPresetEndpoints(): void {
		const allEndpoints = PRESET_ENDPOINTS.flatMap((p) => p.endpoints);
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
				error: (err: unknown) => {
					const mensaje = extractErrorMessage(err, 'Error de autenticación');
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
		logger.log(`[CTestK6] Importando bulk: ${text.length} chars, ${text.split('\n').length} lineas`);
		const { valid, errors } = this.parseBulkCredentials(text);
		logger.log(`[CTestK6] Parsing result: ${valid.length} validos, ${errors.length} errores`, errors);
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
}
