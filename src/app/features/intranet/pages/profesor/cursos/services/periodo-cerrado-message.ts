import { detectarNivel } from '@core/helpers';

/** Salón al que pertenece el curso: su nivel y año definen qué periodo está cerrado. */
export interface SalonPeriodoContexto {
	grado: string;
	anio: number;
}

/**
 * Mensaje de `EVALUACION_PERIODO_CERRADO` con el verbo de la acción, el periodo
 * (nivel + año del salón) y a quién acudir. Sin contexto de salón degrada a un
 * mensaje genérico, nunca a uno con datos inventados.
 */
export function buildPeriodoCerradoMessage(
	verbo: 'crear' | 'modificar',
	salon: SalonPeriodoContexto | null,
): string {
	const nivel = salon ? detectarNivel(salon.grado) : null;
	const periodo = nivel && salon ? `el periodo de ${nivel} ${salon.anio}` : 'el periodo';
	return `No se puede ${verbo} la evaluación: ${periodo} está cerrado. Consulta con administración.`;
}
