import { PESO_MAXIMO, PESO_MINIMO } from '@features/intranet/pages/profesor/models';

/** El profesor piensa el peso en porcentaje; el contrato con la API sigue siendo la fracción 0–1. */
export const PORCENTAJE_MINIMO = Math.round(PESO_MINIMO * 100);
export const PORCENTAJE_MAXIMO = Math.round(PESO_MAXIMO * 100);

/** Fracción del contrato (0.2) → porcentaje entero del formulario (20). */
export function pesoAPorcentaje(peso: number): number {
	return Math.round(peso * 100);
}

/** Porcentaje entero del formulario (20) → fracción del contrato (0.2), sin ruido de punto flotante. */
export function porcentajeAPeso(porcentaje: number): number {
	return Math.round(porcentaje) / 100;
}
