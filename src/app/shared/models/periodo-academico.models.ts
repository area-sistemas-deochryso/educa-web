// #region Constants

/** Meses de verano escolar en Perú (enero y febrero). */
const MESES_VERANO: readonly number[] = [1, 2];

/** Prefijo/nombre de la sección vacacional en la BD. */
export const SECCION_VERANO = 'V';

// #endregion

// #region Types

export type TipoPeriodo = 'regular' | 'verano';

/**
 * Periodo académico con invariantes:
 * - Verano = enero/febrero, sección empieza con "V"
 * - Regular = marzo-diciembre, sección NO empieza con "V"
 *
 * Encapsula la regla que antes estaba dispersa en:
 * - periodo.utils.ts (funciones sueltas)
 * - salones-admin.store.ts (signal calculado)
 * - attendance-director.component.ts (computed manual)
 */
export interface PeriodoAcademico {
	readonly tipo: TipoPeriodo;
	readonly anio: number;
}

// #endregion

// #region Factory & Detection

/**
 * Detecta el periodo académico actual basado en la fecha.
 */
export function periodoActual(): PeriodoAcademico {
	return periodoEnFecha(new Date());
}

/**
 * Detecta el periodo académico de una fecha específica.
 */
export function periodoEnFecha(fecha: Date): PeriodoAcademico {
	const mes = fecha.getMonth() + 1;
	return {
		tipo: MESES_VERANO.includes(mes) ? 'verano' : 'regular',
		anio: fecha.getFullYear(),
	};
}

/**
 * Detecta el periodo a partir de un número de mes (1-12).
 */
export function periodoEnMes(mes: number, anio?: number): PeriodoAcademico {
	return {
		tipo: MESES_VERANO.includes(mes) ? 'verano' : 'regular',
		anio: anio ?? new Date().getFullYear(),
	};
}

// #endregion

// #region Predicates

/**
 * ¿Es periodo de verano?
 */
export function esVerano(periodo: PeriodoAcademico): boolean {
	return periodo.tipo === 'verano';
}

/**
 * ¿Una sección pertenece al periodo de verano?
 * Invariante: sección "V" o que empieza con "V" = verano.
 */
export function esSeccionDeVerano(seccion: string): boolean {
	return seccion.toUpperCase() === SECCION_VERANO;
}

/**
 * ¿Una sección es compatible con un periodo?
 *
 * Invariante central: sección "V" solo en verano, no-"V" solo en regular.
 * Esta regla estaba dispersa en filtrarPorPeriodo(), ahora vive aquí.
 */
export function seccionCompatibleConPeriodo(
	seccion: string,
	periodo: PeriodoAcademico,
): boolean {
	const esSeccionV = esSeccionDeVerano(seccion);
	return periodo.tipo === 'verano' ? esSeccionV : !esSeccionV;
}

// #endregion

// #region Filtering

/**
 * Filtra elementos según el periodo académico.
 *
 * Reemplaza a `filtrarPorPeriodo()` de periodo.utils.ts con una API
 * más semántica que recibe un PeriodoAcademico en vez de un boolean.
 */
export function filtrarPorPeriodoAcademico<T>(
	items: T[],
	periodo: PeriodoAcademico,
	getSeccion: (item: T) => string,
): T[] {
	return items.filter((item) =>
		seccionCompatibleConPeriodo(getSeccion(item), periodo),
	);
}

// #endregion
