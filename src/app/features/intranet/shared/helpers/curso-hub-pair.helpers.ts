import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { filterPairSlots } from './curso-hub-slot.helpers';

// #region Types
/** Par (curso, salón) con todas sus franjas: la unidad que representa una tarjeta de «Mis Cursos». */
export interface CursoHubPairGroup {
	/** Clave estable del par, apta para `track`. */
	key: string;
	cursoId: number;
	salonId: number;
	cursoNombre: string;
	salonDescripcion: string;
	/** Franjas del par en orden semanal. */
	slots: HorarioProfesorDto[];
	/** Nombres distintos de profesor entre las franjas (vacío si ninguna lo trae). */
	profesores: string[];
	/** Estudiantes del salón (dato del par, igual en todas sus franjas). */
	cantidadEstudiantes: number;
}
// #endregion

// #region Grouping
/**
 * Agrupa los horarios del usuario por par (curso, salón). Los pares salen en
 * orden de primera aparición; las franjas de cada par, en orden semanal.
 */
export function groupHorariosByPair(horarios: readonly HorarioProfesorDto[]): CursoHubPairGroup[] {
	const firstByKey = new Map<string, HorarioProfesorDto>();
	for (const h of horarios) {
		const key = `${h.cursoId}-${h.salonId}`;
		if (!firstByKey.has(key)) firstByKey.set(key, h);
	}

	return [...firstByKey].map(([key, first]) => {
		const slots = filterPairSlots(horarios, first.cursoId, first.salonId);
		const profesores = [...new Set(slots.map((s) => s.profesorNombreCompleto).filter((n): n is string => !!n))];
		return {
			key,
			cursoId: first.cursoId,
			salonId: first.salonId,
			cursoNombre: first.cursoNombre,
			salonDescripcion: first.salonDescripcion,
			slots,
			profesores,
			cantidadEstudiantes: first.cantidadEstudiantes,
		};
	});
}
// #endregion
