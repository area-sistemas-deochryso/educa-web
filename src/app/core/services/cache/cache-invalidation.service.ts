import { Injectable, inject } from '@angular/core';

import { logger } from '@core/helpers';
import { SwService } from '@features/intranet/services/sw/sw.service';

/**
 * ============================================================================
 * SERVICIO DE INVALIDACIÓN DE CACHE
 * ============================================================================
 *
 * RESPONSABILIDAD ÚNICA:
 * Gestionar la invalidación del cache offline cuando el backend cambia su estructura.
 *
 * PROBLEMA QUE RESUELVE:
 * Cuando el backend modifica DTOs (agregar/quitar campos, cambiar tipos), el cache
 * offline guarda datos con la estructura antigua. La primera petición del usuario
 * falla porque el frontend intenta deserializar datos incompatibles.
 *
 * SOLUCIÓN:
 * Provee una API semántica para invalidar cache de forma quirúrgica según el contexto:
 * - Todo el cache (logout, cambios globales)
 * - Módulo completo (asistencias, usuarios, reportes)
 * - Endpoint específico (un solo DTO cambió)
 *
 * USO:
 * 1. En guards de módulos cuando hay cambios breaking
 * 2. En servicios antes de llamar endpoints modificados
 * 3. En logout para limpiar datos de sesión
 */
@Injectable({
	providedIn: 'root',
})
export class CacheInvalidationService {
	private swService = inject(SwService);

	// #region Invalidación total

	/**
	 * CUÁNDO USAR: Logout, cambios breaking globales en la API
	 *
	 * EFECTO: Limpia TODO el cache. Todas las próximas peticiones irán al servidor.
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
	// #region Invalidación por módulo

	/**
	 * CUÁNDO USAR: Cuando un módulo completo del backend cambió su estructura
	 *
	 * EFECTO: Invalida todos los endpoints que contengan el patrón.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // En un guard de módulo después de deploy con cambios breaking
	 * async canActivate(): Promise<boolean> {
	 *   await this.cacheInvalidation.invalidateAsistenciasModule();
	 *   return true;
	 * }
	 * ```
	 *
	 * @returns Número de entradas invalidadas
	 */
	async invalidateAsistenciasModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de asistencias');
		return await this.swService.invalidateCacheByPattern('/api/ConsultaAsistencia');
	}

	/**
	 * CUÁNDO USAR: Cuando el módulo de usuarios cambió (DTOs, estructura)
	 *
	 * @returns Número de entradas invalidadas
	 */
	async invalidateUsuariosModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de usuarios');
		return await this.swService.invalidateCacheByPattern('/api/usuarios');
	}

	/**
	 * CUÁNDO USAR: Cuando el módulo de salones cambió
	 *
	 * @returns Número de entradas invalidadas
	 */
	async invalidateSalonesModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de salones');
		return await this.swService.invalidateCacheByPattern('/api/salones');
	}

	/**
	 * CUÁNDO USAR: Cuando el módulo de cursos cambió
	 *
	 * @returns Número de entradas invalidadas
	 */
	async invalidateCursosModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de cursos');
		return await this.swService.invalidateCacheByPattern('/api/cursos');
	}

	/**
	 * CUÁNDO USAR: Cuando el módulo de reportes cambió
	 *
	 * @returns Número de entradas invalidadas
	 */
	async invalidateReportesModule(): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando módulo de reportes');
		return await this.swService.invalidateCacheByPattern('/api/reportes');
	}

	// #endregion
	// #region Invalidación personalizada

	/**
	 * CUÁNDO USAR: Cuando necesitas invalidar un patrón personalizado no cubierto
	 * por los métodos de módulos específicos.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // Invalidar todos los endpoints de un controller específico
	 * await this.cacheInvalidation.invalidateByPattern('/api/Sistema');
	 *
	 * // Invalidar todos los endpoints que contengan "estadisticas"
	 * await this.cacheInvalidation.invalidateByPattern('estadisticas');
	 * ```
	 *
	 * @param pattern - Texto a buscar en las URLs (case-sensitive)
	 * @returns Número de entradas invalidadas
	 */
	async invalidateByPattern(pattern: string): Promise<number> {
		logger.log('[CacheInvalidation] Invalidando patrón personalizado:', pattern);
		return await this.swService.invalidateCacheByPattern(pattern);
	}

	/**
	 * CUÁNDO USAR: Cuando un solo endpoint específico cambió su estructura.
	 *
	 * VENTAJA: Preserva el cache de otros endpoints, mejor performance.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // Antes de llamar un endpoint que sabemos que cambió
	 * await this.cacheInvalidation.invalidateEndpoint(
	 *   'https://api.example.com/api/usuarios/123'
	 * );
	 * const user = await this.api.getUser(123); // Obtiene estructura nueva
	 * ```
	 *
	 * @param url - URL exacta del endpoint (será normalizada automáticamente)
	 */
	async invalidateEndpoint(url: string): Promise<void> {
		logger.log('[CacheInvalidation] Invalidando endpoint específico:', url);
		await this.swService.invalidateCacheByUrl(url);
	}

	// #endregion
	// #region Helpers para casos comunes

	/**
	 * CUÁNDO USAR: Después de hacer deploy con cambios en múltiples módulos.
	 *
	 * EJEMPLO:
	 * ```typescript
	 * // En AppComponent después de detectar nueva versión
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
	 * @param modules - Array de nombres de módulos a invalidar
	 * @returns Total de entradas invalidadas
	 */
	async invalidateMultipleModules(
		modules: Array<'asistencias' | 'usuarios' | 'salones' | 'cursos' | 'reportes'>
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

	/**
	 * CUÁNDO USAR: Para validar si el Service Worker está activo antes de operar.
	 *
	 * VENTAJA: Evita errores en ambientes donde SW no está disponible (dev sin HTTPS).
	 *
	 * @returns true si el SW está registrado y activo
	 */
	isServiceWorkerActive(): boolean {
		return this.swService.isRegistered;
	}
	// #endregion
}
