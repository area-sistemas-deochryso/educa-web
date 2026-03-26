// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap, shareReplay } from 'rxjs';

import { environment } from '@config/environment';
import type {
	ConfiguracionCalificacionListDto,
	NivelEducativo,
} from '@data/models';
// #endregion

// #region Re-exports from pure utils
/**
 * Re-export pure functions so existing consumers that import from
 * '@shared/services/calificacion-config' continue to work unchanged.
 */
export {
	clasificarNota,
	getNotaSeverity,
	getGradeClass,
	isNotaAprobada,
	convertToLiteral,
	formatNotaConConfig,
	type NotaClasificacion,
} from '@shared/utils/calificacion-config.utils';
// #endregion

// #region Servicio con cache HTTP
/**
 * Servicio para cargar y cachear ConfiguracionCalificacion desde la API.
 *
 * Los componentes smart (pages, facades) inyectan este servicio para obtener
 * la config y pasarla a componentes presentacionales via input.
 * Los componentes presentacionales usan las funciones puras exportadas arriba.
 */
@Injectable({ providedIn: 'root' })
export class CalificacionConfigService {
	// #region Dependencias
	private readonly http = inject(HttpClient);
	private readonly baseUrl = environment.apiUrl;
	// #endregion

	// #region Cache
	private readonly cache = new Map<string, Observable<ConfiguracionCalificacionListDto | null>>();
	private readonly resolvedCache = new Map<string, ConfiguracionCalificacionListDto | null>();
	// #endregion

	// #region API
	/**
	 * Obtiene la configuracion de calificacion para un nivel y anio.
	 * Usa cache compartido para evitar requests duplicados.
	 */
	getConfig(nivel: NivelEducativo, anio?: number): Observable<ConfiguracionCalificacionListDto | null> {
		const year = anio ?? new Date().getFullYear();
		const key = `${nivel}-${year}`;

		if (this.cache.has(key)) {
			return this.cache.get(key)!;
		}

		const request$ = this.http
			.get<ConfiguracionCalificacionListDto>(
				`${this.baseUrl}/api/ConfiguracionCalificacion/nivel/${nivel}?anio=${year}`,
			)
			.pipe(
				map((data) => (data && typeof data === 'object' && !('success' in data) ? data : null)),
				catchError(() => of(null)),
				tap((config) => this.resolvedCache.set(key, config)),
				shareReplay(1),
			);

		this.cache.set(key, request$);
		return request$;
	}

	/**
	 * Obtiene la config de forma sincrona si ya fue cargada.
	 * Retorna null si aun no se ha cargado (usar getConfig() primero).
	 */
	getConfigSync(nivel: NivelEducativo, anio?: number): ConfiguracionCalificacionListDto | null {
		const year = anio ?? new Date().getFullYear();
		return this.resolvedCache.get(`${nivel}-${year}`) ?? null;
	}

	/** Pre-carga todas las configs del anio actual */
	preloadConfigs(anio?: number): Observable<ConfiguracionCalificacionListDto[]> {
		const year = anio ?? new Date().getFullYear();
		return this.http
			.get<ConfiguracionCalificacionListDto[]>(
				`${this.baseUrl}/api/ConfiguracionCalificacion/anio/${year}`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				tap((configs) => {
					for (const config of configs) {
						const key = `${config.nivel}-${config.anio}`;
						this.resolvedCache.set(key, config);
						this.cache.set(key, of(config));
					}
				}),
				catchError(() => of([])),
			);
	}

	/** Limpia cache (util en logout o cambio de anio) */
	clearCache(): void {
		this.cache.clear();
		this.resolvedCache.clear();
	}
	// #endregion
}
// #endregion
