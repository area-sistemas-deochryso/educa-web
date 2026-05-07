import { Injectable, inject } from '@angular/core';

import { logger } from '@core/helpers';
import { SwService } from '@features/intranet/services/sw/sw.service';

/**
 * Invalida el SW cache cuando el backend cambia DTOs. Tres niveles: todo el cache,
 * por módulo, o por endpoint puntual.
 */
@Injectable({
	providedIn: 'root',
})
export class CacheInvalidationService {
	private swService = inject(SwService);

	// #region Invalidación total

	/** Limpia TODO el cache (logout o cambios breaking globales). */
	async invalidateAll(): Promise<void> {
		logger.log('[CacheInvalidation] Invalidando TODO el cache');
		await this.swService.clearCache();
	}

	// #endregion
	// #region Invalidación por módulo

	async invalidateAsistenciasModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de asistencias');
		return await this.swService.invalidateCacheByPattern('/api/ConsultaAsistencia');
	}

	async invalidateUsuariosModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de usuarios');
		return await this.swService.invalidateCacheByPattern('/api/usuarios');
	}

	async invalidateSalonesModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de salones');
		return await this.swService.invalidateCacheByPattern('/api/salones');
	}

	async invalidateCursosModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de cursos');
		return await this.swService.invalidateCacheByPattern('/api/cursos');
	}

	async invalidateReportesModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de reportes');
		return await this.swService.invalidateCacheByPattern('/api/reportes');
	}

	// #endregion
	// #region Invalidación personalizada

	/** Patrón libre cuando los métodos por módulo no cubren el caso. */
	async invalidateByPattern(pattern: string): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando patrón personalizado:', pattern);
		return await this.swService.invalidateCacheByPattern(pattern);
	}

	/** Invalida una URL exacta (preserva el resto del cache). */
	async invalidateEndpoint(url: string): Promise<void> {
		logger.log('[CacheInvalidation] Invalidando endpoint específico:', url);
		await this.swService.invalidateCacheByUrl(url);
	}

	// #endregion
	// #region Helpers para casos comunes

	async invalidateMultipleModules(
		modules: ('asistencias' | 'usuarios' | 'salones' | 'cursos' | 'reportes')[]
	): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando múltiples módulos:', modules);
		let totalInvalidated = 0;

		for (const module of modules) {
			switch (module) {
				case 'asistencias':
					totalInvalidated += await this.invalidateAsistenciasModule();
					break;
				case 'usuarios':
					totalInvalidated += await this.invalidateUsuariosModule();
					break;
				case 'salones':
					totalInvalidated += await this.invalidateSalonesModule();
					break;
				case 'cursos':
					totalInvalidated += await this.invalidateCursosModule();
					break;
				case 'reportes':
					totalInvalidated += await this.invalidateReportesModule();
					break;
			}
		}

		logger.log(`[CacheInvalidation] Total invalidado: ${totalInvalidated} entradas`);
		return totalInvalidated;
	}

	isServiceWorkerActive(): boolean {
		return this.swService.isRegistered;
	}
	// #endregion
}
