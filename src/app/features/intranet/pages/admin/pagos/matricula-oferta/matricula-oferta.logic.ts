// #region Imports
import type { GenerarCargosAlumnoPayload, VistaPreviaGeneracion } from '@data/models';
import { describirMotivoOmision } from '../utils/carga-inicial.logic';
// #endregion

/** Estudiante al que se le ofrece generar matrícula e inscripción (lo aloja el paso 2 del alta de usuario). */
export interface MatriculaOfertaContexto {
	estudianteId: number;
	nombre: string;
	anio: number;
}

// #region Payload
/** La inscripción solo nace para el alumno marcado como nuevo (`INV-PG06`); la matrícula siempre se ofrece. */
export function armarPayloadAlumno(anio: number, estudianteId: number, esNuevo: boolean): GenerarCargosAlumnoPayload {
	return { anio, estudianteId, esNuevo };
}
// #endregion

// #region Lectura de la vista previa
/** Lo que se va a escribir al confirmar. */
export function hayAlgoQueCrear(vp: VistaPreviaGeneracion | null): boolean {
	return (vp?.aCrear ?? 0) > 0;
}

/**
 * Por qué no hay nada que crear, dicho en una frase. `null` si sí hay cargos por crear.
 * - Todo ya existe → idempotencia (repetir no duplica), no es un problema.
 * - Hay omitidos → el motivo del BE (sin parámetros, sin monto, sin salón del año).
 */
export function motivoSinCargos(vp: VistaPreviaGeneracion | null): string | null {
	if (!vp || vp.aCrear > 0) return null;
	if (vp.omitidos.length > 0) return vp.omitidos.map(describirMotivoOmision).join(' ');
	if (vp.yaExisten > 0) return 'Este alumno ya tiene sus cargos de matrícula. No se crea nada nuevo.';
	return 'No hay cargos para crear con esta elección.';
}

/** «1 cargo» / «3 cargos». */
export const cargosTexto = (n: number): string => (n === 1 ? '1 cargo' : `${n} cargos`);

/** Línea de resumen sobre la tabla de la vista previa. */
export function resumenOferta(vp: VistaPreviaGeneracion): string {
	if (vp.aCrear === 0) return 'No se crea ningún cargo nuevo.';
	const yaExisten = vp.yaExisten > 0 ? ` (${vp.yaExisten} ${vp.yaExisten === 1 ? 'ya existía' : 'ya existían'})` : '';
	return `${vp.aCrear === 1 ? 'Se creará' : 'Se crearán'} ${cargosTexto(vp.aCrear)}${yaExisten}.`;
}
// #endregion

// #region Avisos
export const TITULO_AVISO_SIN_CARGO = 'Matrícula sin cargo';

/** Aviso suave de F7 cuando la persona omite el ofrecimiento: nunca bloquea. */
export function avisoSinCargo(nombre: string): string {
	return `${nombre} quedó matriculado sin cargo de matrícula. Puedes generarlo después desde Pagos › Consistencia.`;
}

/** Solo un Estudiante con salón y permiso de pagos recibe el ofrecimiento. */
export function debeOfrecerMatricula(rol: string | undefined, salonId: number | null | undefined, puedeGestionarPagos: boolean): boolean {
	return rol === 'Estudiante' && !!salonId && puedeGestionarPagos;
}
// #endregion
