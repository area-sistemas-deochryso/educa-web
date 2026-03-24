/**
 * @deprecated Usar `@shared/models` en su lugar:
 * - `periodoActual()`, `periodoEnMes()`, `periodoEnFecha()` para detección
 * - `filtrarPorPeriodoAcademico()` para filtrado
 * - `esSeccionDeVerano()` para verificar sección
 * - `esVerano()` para verificar periodo
 */

// #region Constants
/** @deprecated Usar SECCION_VERANO de `@shared/models` */
const MESES_VERANO = [1, 2];

/** @deprecated Usar SECCION_VERANO de `@shared/models/periodo-academico.models` */
export const SECCION_VERANO = 'V';
// #endregion

// #region Detection

/** @deprecated Usar `esVerano(periodoActual())` de `@shared/models` */
export function esPeriodoVerano(): boolean {
	return MESES_VERANO.includes(new Date().getMonth() + 1);
}

/** @deprecated Usar `periodoEnFecha(fecha)` de `@shared/models` */
export function esPeriodoVeranoEnFecha(fecha: Date): boolean {
	return MESES_VERANO.includes(fecha.getMonth() + 1);
}

// #endregion

// #region Filtering

/** @deprecated Usar `filtrarPorPeriodoAcademico()` de `@shared/models` */
export function filtrarPorPeriodo<T>(
	items: T[],
	esVerano: boolean,
	getSeccion: (item: T) => string,
): T[] {
	return esVerano
		? items.filter((i) => getSeccion(i).toUpperCase() === SECCION_VERANO)
		: items.filter((i) => getSeccion(i).toUpperCase() !== SECCION_VERANO);
}

/** @deprecated Usar `esSeccionDeVerano()` de `@shared/models` */
export function esSeccionVerano(seccion: string): boolean {
	return seccion.toUpperCase() === SECCION_VERANO;
}

// #endregion
