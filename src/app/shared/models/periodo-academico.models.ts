// #region Types

export type TipoPeriodo = 'regular' | 'verano';

/**
 * Periodo académico con invariantes:
 * - Verano = enero/febrero, sección empieza con "V"
 * - Regular = marzo-diciembre, sección NO empieza con "V"
 */
export interface PeriodoAcademico {
	readonly tipo: TipoPeriodo;
	readonly anio: number;
}

// #endregion

// Re-export utils para compatibilidad con imports existentes
export {
	SECCION_VERANO,
	periodoActual,
	periodoEnFecha,
	periodoEnMes,
	esVerano,
	esSeccionDeVerano,
	seccionCompatibleConPeriodo,
	filtrarPorPeriodoAcademico,
} from '@shared/utils/periodo-academico.utils';
