import { formatDateLocalIso } from '@core/helpers';

// #region Tipos — GET/POST/PUT /api/BimestresAsistencia (Plan xrepo-116)
/** Bimestre configurado para el reporte de asistencia. `fechaInicio`/`fechaFin` llegan como ISO ("2026-08-10T00:00:00"). */
export interface BimestreAsistencia {
	id: number;
	anio: number;
	numero: number;
	/** Ej. "III Bimestre". */
	nombre: string;
	fechaInicio: string;
	fechaFin: string;
	rowVersion: string;
}

export interface ActualizarBimestrePayload {
	fechaInicio: string;
	fechaFin: string;
	rowVersion: string;
}
// #endregion

// #region Helpers puros
/** Convierte el ISO del BE a `Date` local sin corrimiento de huso (se recorta con slice, no con `new Date(iso)`). */
export function isoToLocalDate(iso: string): Date {
	return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** "10/08" a partir del ISO del BE. */
export function isoToCorto(iso: string): string {
	const [, mes, dia] = iso.slice(0, 10).split('-');
	return `${dia}/${mes}`;
}

/**
 * Bimestre a preseleccionar: el que contiene `hoy`; si hoy cae en un hueco (ej. vacaciones entre bimestres)
 * el último que ya empezó; si ninguno empezó, el primero. `null` si no hay bimestres.
 */
export function elegirBimestreDefault(bimestres: BimestreAsistencia[], hoy: Date): BimestreAsistencia | null {
	if (bimestres.length === 0) return null;
	const hoyIso = formatDateLocalIso(hoy);
	const ordenados = [...bimestres].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

	const actual = ordenados.find((b) => b.fechaInicio.slice(0, 10) <= hoyIso && hoyIso <= b.fechaFin.slice(0, 10));
	if (actual) return actual;

	const yaEmpezados = ordenados.filter((b) => b.fechaInicio.slice(0, 10) <= hoyIso);
	return yaEmpezados.length > 0 ? yaEmpezados[yaEmpezados.length - 1] : ordenados[0];
}

/**
 * Valida una edición con las mismas reglas del BE (INV-RE05): inicio <= fin, fechas dentro del año del
 * bimestre y sin solape con los **otros bimestres ya guardados** (el BE compara contra lo guardado, no
 * contra ediciones sin guardar). Devuelve el mensaje de error o `''` si es válida. El BE sigue siendo la
 * fuente de verdad: esto solo evita un viaje de ida y vuelta.
 */
export function validarEdicion(
	edicion: { fechaInicio: Date | null; fechaFin: Date | null },
	anio: number,
	otros: Pick<BimestreAsistencia, 'nombre' | 'fechaInicio' | 'fechaFin'>[],
): string {
	const { fechaInicio, fechaFin } = edicion;
	if (!fechaInicio || !fechaFin) return 'Indica fecha de inicio y de fin.';
	if (fechaFin < fechaInicio) return 'La fecha de fin no puede ser anterior a la de inicio.';
	if (fechaInicio.getFullYear() !== anio || fechaFin.getFullYear() !== anio) {
		return `Las fechas deben estar dentro del año ${anio}.`;
	}

	const solapado = otros.find((o) => fechaInicio <= isoToLocalDate(o.fechaFin) && fechaFin >= isoToLocalDate(o.fechaInicio));
	return solapado ? `Se solapa con el ${solapado.nombre} (${isoToCorto(solapado.fechaInicio)} a ${isoToCorto(solapado.fechaFin)}).` : '';
}
// #endregion
