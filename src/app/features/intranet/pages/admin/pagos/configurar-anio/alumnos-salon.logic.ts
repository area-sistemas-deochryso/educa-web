import type { SalonAdminListDto } from '@data/models';

/** Opción del filtro de salón del paso «Generar cargos». `salonId = null` es «todo el año». */
export interface OpcionSalon {
	salonId: number | null;
	nombre: string;
}

export const TODOS_LOS_SALONES: OpcionSalon = { salonId: null, nombre: 'Todos los salones' };

/** «Todos» primero y luego los salones del año por grado y sección; la sede solo se nombra si hay más de una. */
export function opcionesSalon(salones: readonly SalonAdminListDto[]): OpcionSalon[] {
	const variasSedes = new Set(salones.map((s) => s.sede)).size > 1;
	const ordenados = [...salones].sort((a, b) => a.gradoOrden - b.gradoOrden || a.seccion.localeCompare(b.seccion, 'es'));
	return [
		TODOS_LOS_SALONES,
		...ordenados.map((s) => ({
			salonId: s.id,
			nombre: variasSedes && s.sede ? `${s.grado} ${s.seccion} · ${s.sede}` : `${s.grado} ${s.seccion}`,
		})),
	];
}

/** Marca o desmarca a un alumno como nuevo (los que reciben inscripción), sin duplicar. */
export function alternarNuevo(marcados: readonly number[], estudianteId: number, marcado: boolean): number[] {
	const sin = marcados.filter((id) => id !== estudianteId);
	return marcado ? [...sin, estudianteId] : sin;
}

/** Los alumnos elegidos por buscador y los marcados en la lista del salón son un solo conjunto de inscripción. */
export function idsInscripcion(porBusqueda: readonly number[], porSalon: readonly number[]): number[] {
	return [...new Set([...porBusqueda, ...porSalon])];
}

export function resumenNuevos(total: number, nuevos: number): string {
	if (total === 0) return 'El salón no tiene alumnos.';
	if (nuevos === 0) return `${total} ${total === 1 ? 'alumno' : 'alumnos'}, ninguno marcado como nuevo.`;
	return `${total} ${total === 1 ? 'alumno' : 'alumnos'}, ${nuevos} ${nuevos === 1 ? 'marcado' : 'marcados'} como ${nuevos === 1 ? 'nuevo' : 'nuevos'}.`;
}
