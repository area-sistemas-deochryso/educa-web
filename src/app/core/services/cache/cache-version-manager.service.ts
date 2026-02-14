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
 * GESTOR AUTOMÃƒÂTICO DE VERSIONES DE CACHE
 * ============================================================================
 *
 * RESPONSABILIDAD ÃƒÅ¡NICA:
 * Detectar automÃƒÂ¡ticamente cambios de versiÃƒÂ³n y invalidar cache sin intervenciÃƒÂ³n manual.
 *
 * PROBLEMA QUE RESUELVE:
 * Los desarrolladores olvidan invalidar cache manualmente cuando cambian el backend.
 * Esto causa errores de deserializaciÃƒÂ³n intermitentes en producciÃƒÂ³n.
 *
 * SOLUCIÃƒâ€œN:
 * Sistema automÃƒÂ¡tico que:
 * 1. Al iniciar la app, compara versiones configuradas vs guardadas en localStorage
 * 2. Si una versiÃƒÂ³n cambiÃƒÂ³ Ã¢â€ â€™ invalida automÃƒÂ¡ticamente el cache de ese mÃƒÂ³dulo
 * 3. Guarda las nuevas versiones
 * 4. Todo es invisible para el usuario final
 *
 * PARA EL DESARROLLADOR:
 * Solo cambiar el nÃƒÂºmero de versiÃƒÂ³n en cache-versions.config.ts cuando hay cambios breaking.
 * El resto es automÃƒÂ¡tico.
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
	 * Inicializa el sistema de versionado automÃƒÂ¡tico.
	 * Se llama automÃƒÂ¡ticamente desde AppComponent.
	 *
	 * IMPORTANTE: No requiere intervenciÃƒÂ³n del desarrollador.
	 * Solo se ejecuta una vez al cargar la app.
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// Solo funciona si el Service Worker estÃƒÂ¡ activo
		if (!this.swService.isRegistered) {
			logger.log('[CacheVersionManager] SW no activo, skip version check');
			this.initialized = true;
			return;
		}

		logger.log('[CacheVersionManager] Iniciando verificaciÃƒÂ³n de versiones...');

		const storedVersions = this.getStoredVersions();
		const modulesInvalidated: string[] = [];
		let totalEntriesInvalidated = 0;

		// Comparar cada mÃƒÂ³dulo
		for (const [module, currentVersion] of Object.entries(CACHE_VERSIONS)) {
			const moduleKey = module as CacheModule;
			const storedVersion = storedVersions[moduleKey];

			// Si la versiÃƒÂ³n cambiÃƒÂ³ Ã¢â€ â€™ invalidar cache de ese mÃƒÂ³dulo
			if (storedVersion && storedVersion !== currentVersion) {
				logger.log(
					`[CacheVersionManager] MÃƒÂ³dulo "${module}" cambiÃƒÂ³: ${storedVersion} Ã¢â€ â€™ ${currentVersion}`
				);

				const pattern = MODULE_URL_PATTERNS[moduleKey];
				const count = await this.swService.invalidateCacheByPattern(pattern);

				totalEntriesInvalidated += count;
				modulesInvalidated.push(module);
			} else if (!storedVersion) {
				// Primera vez que se ejecuta Ã¢â€ â€™ solo guardar versiÃƒÂ³n sin invalidar
				logger.log(`[CacheVersionManager] MÃƒÂ³dulo "${module}" inicializado en v${currentVersion}`);
			}
		}

		// Guardar las nuevas versiones
		this.saveVersions(CACHE_VERSIONS);

		// Resumen de la operaciÃƒÂ³n
		if (modulesInvalidated.length > 0) {
			logger.log(
				`[CacheVersionManager] Ã¢Å“â€¦ Cache invalidado automÃƒÂ¡ticamente:
				- MÃƒÂ³dulos: ${modulesInvalidated.join(', ')}
				- Total entradas eliminadas: ${totalEntriesInvalidated}`
			);
		} else {
			logger.log('[CacheVersionManager] Ã¢Å“â€¦ Todas las versiones estÃƒÂ¡n actualizadas');
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
	 * Resetea todas las versiones guardadas para forzar una verificaciÃƒÂ³n completa.
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
