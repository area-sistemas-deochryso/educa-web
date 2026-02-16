// #region Imports
import { Injectable, inject } from '@angular/core';

import { logger } from '@core/helpers';
import {
	CACHE_VERSIONS,
	MODULE_URL_PATTERNS,
	type CacheModule,
} from '@config/cache-versions.config';
import { SwService } from '@features/intranet/services/sw/sw.service';

/**
 * ============================================================================
 * GESTOR AUTOMÁTICO DE VERSIONES DE CACHE
 * ============================================================================
 *
 * RESPONSABILIDAD ÚNICA:
 * Detectar automáticamente cambios de versión y invalidar cache sin intervención manual.
 *
 * PROBLEMA QUE RESUELVE:
 * Los desarrolladores olvidan invalidar cache manualmente cuando cambian el backend.
 * Esto causa errores de deserialización intermitentes en producción.
 *
 * SOLUCIÓN:
 * Sistema automático que:
 * 1. Al iniciar la app, compara versiones configuradas vs guardadas en localStorage
 * 2. Si una versión cambió → invalida automáticamente el cache de ese módulo
 * 3. Guarda las nuevas versiones
 * 4. Todo es invisible para el usuario final
 *
 * PARA EL DESARROLLADOR:
 * Solo cambiar el número de versión en cache-versions.config.ts cuando hay cambios breaking.
 * El resto es automático.
 */
// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class CacheVersionManagerService {
	private swService = inject(SwService);
	private readonly STORAGE_KEY = 'cache-module-versions';
	private initialized = false;

	/**
	 * Inicializa el sistema de versionado automático.
	 * Se llama automáticamente desde AppComponent.
	 *
	 * IMPORTANTE: No requiere intervención del desarrollador.
	 * Solo se ejecuta una vez al cargar la app.
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// Solo funciona si el Service Worker está activo
		if (!this.swService.isRegistered) {
			logger.log('[CacheVersionManager] SW no activo, skip version check');
			this.initialized = true;
			return;
		}

		logger.log('[CacheVersionManager] Iniciando verificación de versiones...');

		const storedVersions = this.getStoredVersions();
		const modulesInvalidated: string[] = [];
		let totalEntriesInvalidated = 0;

		// Comparar cada módulo
		for (const [module, currentVersion] of Object.entries(CACHE_VERSIONS)) {
			const moduleKey = module as CacheModule;
			const storedVersion = storedVersions[moduleKey];

			// Si la versión cambió → invalidar cache de ese módulo
			if (storedVersion && storedVersion !== currentVersion) {
				logger.log(
					`[CacheVersionManager] Módulo "${module}" cambió: ${storedVersion} → ${currentVersion}`
				);

				const pattern = MODULE_URL_PATTERNS[moduleKey];
				const count = await this.swService.invalidateCacheByPattern(pattern);

				totalEntriesInvalidated += count;
				modulesInvalidated.push(module);
			} else if (!storedVersion) {
				// Primera vez que se ejecuta → solo guardar versión sin invalidar
				logger.log(`[CacheVersionManager] Módulo "${module}" inicializado en v${currentVersion}`);
			}
		}

		// Guardar las nuevas versiones
		this.saveVersions(CACHE_VERSIONS);

		// Resumen de la operación
		if (modulesInvalidated.length > 0) {
			logger.log(
				`[CacheVersionManager] ✅ Cache invalidado automáticamente:
				- Módulos: ${modulesInvalidated.join(', ')}
				- Total entradas eliminadas: ${totalEntriesInvalidated}`
			);
		} else {
			logger.log('[CacheVersionManager] ✅ Todas las versiones están actualizadas');
		}

		this.initialized = true;
	}

	/**
	 * Obtiene las versiones guardadas en localStorage
	 */
	private getStoredVersions(): Partial<Record<CacheModule, string>> {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			return stored ? JSON.parse(stored) : {};
		} catch (error) {
			logger.error('[CacheVersionManager] Error leyendo versiones guardadas:', error);
			return {};
		}
	}

	/**
	 * Guarda las versiones actuales en localStorage
	 */
	private saveVersions(versions: typeof CACHE_VERSIONS): void {
		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(versions));
		} catch (error) {
			logger.error('[CacheVersionManager] Error guardando versiones:', error);
		}
	}

	/**
	 * SOLO PARA DEBUG/DESARROLLO
	 * Resetea todas las versiones guardadas para forzar una verificación completa.
	 *
	 * USO:
	 * ```typescript
	 * // En consola del navegador
	 * inject(CacheVersionManagerService).resetVersions();
	 * location.reload();
	 * ```
	 */
	resetVersions(): void {
		localStorage.removeItem(this.STORAGE_KEY);
		this.initialized = false;
		logger.log('[CacheVersionManager] Versiones reseteadas. Recargar para re-verificar.');
	}

	/**
	 * SOLO PARA DEBUG/DESARROLLO
	 * Muestra las versiones actuales vs guardadas
	 */
	showVersionStatus(): void {
		const stored = this.getStoredVersions();

		console.table({
			Current: CACHE_VERSIONS,
			Stored: stored,
		});
	}
}
// #endregion
