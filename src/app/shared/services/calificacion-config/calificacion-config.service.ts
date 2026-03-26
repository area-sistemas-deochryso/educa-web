// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap, shareReplay } from 'rxjs';

import { environment } from '@config/environment';
import type {
	ConfiguracionCalificacionListDto,
	ConfiguracionLiteralDto,
	NivelEducativo,
} from '@data/models';
// #endregion

// #region Tipos
type PrimeNgSeverity = 'success' | 'warn' | 'danger' | 'secondary';

export interface NotaClasificacion {
	severity: PrimeNgSeverity;
	cssClass: 'grade-green' | 'grade-yellow' | 'grade-red' | '';
	label: string;
	esAprobatoria: boolean;
}

/** Defaults cuando no hay config cargada (compatibilidad con umbrales históricos) */
const DEFAULTS = {
	notaMinAprobatoria: 11,
	notaExcelente: 14,
} as const;
// #endregion

// #region Funciones puras de clasificación
/**
 * Clasifica una nota según la configuración del nivel.
 * Si config es null, usa defaults históricos (14/11).
 *
 * Función pura — importable directamente en componentes presentacionales
 * sin necesidad de inyección de dependencias.
 */
export function clasificarNota(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): NotaClasificacion {
	if (nota === null || nota === undefined) {
		return { severity: 'secondary', cssClass: '', label: '-', esAprobatoria: false };
	}

	if (config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0) {
		return clasificarNotaLiteral(nota, config.literales);
	}

	return clasificarNotaNumerica(nota, config);
}

/**
 * Severity de PrimeNG para una nota.
 * Reemplaza los `getNotaSeverity()` hardcodeados en componentes.
 */
export function getNotaSeverity(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): PrimeNgSeverity {
	return clasificarNota(nota, config).severity;
}

/**
 * Clase CSS para una nota ('grade-green' | 'grade-red' | '').
 * Reemplaza los `getGradeClass()` hardcodeados en componentes.
 */
export function getGradeClass(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): string {
	return clasificarNota(nota, config).cssClass;
}

/**
 * Determina si una nota es aprobatoria según la configuración.
 */
export function isNotaAprobada(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): boolean {
	return clasificarNota(nota, config).esAprobatoria;
}

/**
 * Convierte una nota numérica a su equivalente literal (AD, A, B, C).
 * Retorna null si el tipo no es LITERAL o no hay config.
 */
export function convertToLiteral(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null,
): ConfiguracionLiteralDto | null {
	if (nota === null || nota === undefined) return null;
	if (config?.tipoCalificacion !== 'LITERAL' || config.literales.length === 0) return null;

	const sorted = [...config.literales].sort((a, b) => a.orden - b.orden);
	for (const literal of sorted) {
		if (literal.notaMinima !== null && literal.notaMaxima !== null) {
			if (nota >= literal.notaMinima && nota <= literal.notaMaxima) {
				return literal;
			}
		}
	}
	return sorted[sorted.length - 1] ?? null;
}

/**
 * Formatea una nota según el tipo de calificación.
 * NUMERICO: "14.5", LITERAL: "A"
 */
export function formatNotaConConfig(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): string {
	if (nota === null || nota === undefined) return '-';

	if (config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0) {
		const literal = convertToLiteral(nota, config);
		return literal ? literal.letra : nota.toFixed(1);
	}

	return nota.toFixed(1);
}

function clasificarNotaNumerica(
	nota: number,
	config: ConfiguracionCalificacionListDto | null,
): NotaClasificacion {
	const minAprobatoria = config?.notaMinAprobatoria ?? DEFAULTS.notaMinAprobatoria;
	// "Excelente" es ~127% del mínimo aprobatorio (14/11 ≈ 1.27)
	const excelente = config?.notaMinAprobatoria
		? Math.round(config.notaMinAprobatoria * 1.27)
		: DEFAULTS.notaExcelente;

	if (nota >= excelente) {
		return { severity: 'success', cssClass: 'grade-green', label: 'Excelente', esAprobatoria: true };
	}
	if (nota >= minAprobatoria) {
		return { severity: 'warn', cssClass: 'grade-green', label: 'Aprobado', esAprobatoria: true };
	}
	return { severity: 'danger', cssClass: 'grade-red', label: 'Desaprobado', esAprobatoria: false };
}

function clasificarNotaLiteral(
	nota: number,
	literales: ConfiguracionLiteralDto[],
): NotaClasificacion {
	const sorted = [...literales].sort((a, b) => a.orden - b.orden);

	for (const literal of sorted) {
		if (literal.notaMinima !== null && literal.notaMaxima !== null) {
			if (nota >= literal.notaMinima && nota <= literal.notaMaxima) {
				return {
					severity: literal.esAprobatoria ? (literal.orden <= 1 ? 'success' : 'warn') : 'danger',
					cssClass: literal.esAprobatoria ? 'grade-green' : 'grade-red',
					label: `${literal.letra} - ${literal.descripcion}`,
					esAprobatoria: literal.esAprobatoria,
				};
			}
		}
	}

	return { severity: 'secondary', cssClass: '', label: '-', esAprobatoria: false };
}
// #endregion

// #region Servicio con cache HTTP
/**
 * Servicio para cargar y cachear ConfiguracionCalificacion desde la API.
 *
 * Los componentes smart (pages, facades) inyectan este servicio para obtener
 * la config y pasarla a componentes presentacionales vía input.
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
	 * Obtiene la configuración de calificación para un nivel y año.
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
	 * Obtiene la config de forma síncrona si ya fue cargada.
	 * Retorna null si aún no se ha cargado (usar getConfig() primero).
	 */
	getConfigSync(nivel: NivelEducativo, anio?: number): ConfiguracionCalificacionListDto | null {
		const year = anio ?? new Date().getFullYear();
		return this.resolvedCache.get(`${nivel}-${year}`) ?? null;
	}

	/** Pre-carga todas las configs del año actual */
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

	/** Limpia cache (útil en logout o cambio de año) */
	clearCache(): void {
		this.cache.clear();
		this.resolvedCache.clear();
	}
	// #endregion
}
// #endregion
