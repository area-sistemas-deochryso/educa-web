import { Injectable, inject } from '@angular/core';

import { logger } from '@core/helpers';
import { SwService } from '@features/intranet/services/sw/sw.service';

/**
 * ============================================================================
 * SERVICIO DE INVALIDACIÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“N DE CACHE
 * ============================================================================
 *
 * RESPONSABILIDAD ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡NICA:
 * Gestionar la invalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n del cache offline cuando el backend cambia su estructura.
 *
 * PROBLEMA QUE RESUELVE:
 * Cuando el backend modifica DTOs (agregar/quitar campos, cambiar tipos), el cache
 * offline guarda datos con la estructura antigua. La primera peticiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n del usuario
 * falla porque el frontend intenta deserializar datos incompatibles.
 *
 * SOLUCIÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“N:
 * Provee una API semÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ntica para invalidar cache de forma quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica segÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºn el contexto:
 * - Todo el cache (logout, cambios globales)
 * - MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo completo (asistencias, usuarios, reportes)
 * - Endpoint especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­fico (un solo DTO cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³)
 *
 * USO:
 * 1. En guards de mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulos cuando hay cambios breaking
 * 2. En servicios antes de llamar endpoints modificados
 * 3. En logout para limpiar datos de sesiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
 */
@Injectable({
	providedIn: 'root',
})
export class CacheInvalidationService {
	private swService = inject(SwService);

	// #region InvalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n total

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Logout, cambios breaking globales en la API
	 *
	 * EFECTO: Limpia TODO el cache. Todas las prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ximas peticiones irÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡n al servidor.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // En logout
	 * logout(): void {
	 *   await this.cacheInvalidation.invalidateAll();
	 *   this.router.navigate(['/login']);
	 * }
	 * ```
	 */
	async invalidateAll(): Promise<void> {
		logger.log('[CacheInvalidation] Invalidando TODO el cache');
		await this.swService.clearCache();
	}

	// #endregion
	// #region InvalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n por mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando un mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo completo del backend cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ su estructura
	 *
	 * EFECTO: Invalida todos los endpoints que contengan el patrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // En un guard de mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo despuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©s de deploy con cambios breaking
	 * async canActivate(): Promise<boolean> {
	 *   await this.cacheInvalidation.invalidateAsistenciasModule();
	 *   return true;
	 * }
	 * ```
	 *
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas
	 */
	async invalidateAsistenciasModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de asistencias');
		return await this.swService.invalidateCacheByPattern('/api/ConsultaAsistencia');
	}

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando el mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de usuarios cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ (DTOs, estructura)
	 *
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas
	 */
	async invalidateUsuariosModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de usuarios');
		return await this.swService.invalidateCacheByPattern('/api/usuarios');
	}

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando el mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de salones cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
	 *
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas
	 */
	async invalidateSalonesModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de salones');
		return await this.swService.invalidateCacheByPattern('/api/salones');
	}

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando el mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de cursos cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
	 *
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas
	 */
	async invalidateCursosModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de cursos');
		return await this.swService.invalidateCacheByPattern('/api/cursos');
	}

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando el mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de reportes cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
	 *
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas
	 */
	async invalidateReportesModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo de reportes');
		return await this.swService.invalidateCacheByPattern('/api/reportes');
	}

	// #endregion
	// #region InvalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n personalizada

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando necesitas invalidar un patrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n personalizado no cubierto
	 * por los mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©todos de mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulos especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ficos.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // Invalidar todos los endpoints de un controller especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­fico
	 * await this.cacheInvalidation.invalidateByPattern('/api/Sistema');
	 *
	 * // Invalidar todos los endpoints que contengan "estadisticas"
	 * await this.cacheInvalidation.invalidateByPattern('estadisticas');
	 * ```
	 *
	 * @param pattern - Texto a buscar en las URLs (case-sensitive)
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas
	 */
	async invalidateByPattern(pattern: string): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando patrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n personalizado:', pattern);
		return await this.swService.invalidateCacheByPattern(pattern);
	}

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Cuando un solo endpoint especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­fico cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ su estructura.
	 *
	 * VENTAJA: Preserva el cache de otros endpoints, mejor performance.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // Antes de llamar un endpoint que sabemos que cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
	 * await this.cacheInvalidation.invalidateEndpoint(
	 *   'https://api.example.com/api/usuarios/123'
	 * );
	 * const user = await this.api.getUser(123); // Obtiene estructura nueva
	 * ```
	 *
	 * @param url - URL exacta del endpoint (serÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ normalizada automÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ticamente)
	 */
	async invalidateEndpoint(url: string): Promise<void> {
		logger.log('[CacheInvalidation] Invalidando endpoint especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­fico:', url);
		await this.swService.invalidateCacheByUrl(url);
	}

	// #endregion
	// #region Helpers para casos comunes

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: DespuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©s de hacer deploy con cambios en mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºltiples mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulos.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // En AppComponent despuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©s de detectar nueva versiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
	 * async ngOnInit(): Promise<void> {
	 *   const version = await this.api.getVersion();
	 *   if (version !== this.localVersion) {
	 *     await this.cacheInvalidation.invalidateMultipleModules([
	 *       'asistencias',
	 *       'usuarios',
	 *       'reportes'
	 *     ]);
	 *     this.localVersion = version;
	 *   }
	 * }
	 * ```
	 *
	 * @param modules - Array de nombres de mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulos a invalidar
	 * @returns Total de entradas invalidadas
	 */
	async invalidateMultipleModules(
		modules: Array<'asistencias' | 'usuarios' | 'salones' | 'cursos' | 'reportes'>
	): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºltiples mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulos:', modules);
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

	/**
	 * CUÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂNDO USAR: Para validar si el Service Worker estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ activo antes de operar.
	 *
	 * VENTAJA: Evita errores en ambientes donde SW no estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ disponible (dev sin HTTPS).
	 *
	 * @returns true si el SW estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ registrado y activo
	 */
	isServiceWorkerActive(): boolean {
		return this.swService.isRegistered;
	}
	// #endregion
}
