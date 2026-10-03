import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import type { CursoHubRol, CursoHubTarget } from './curso-hub-link.helpers';

// #region Types
export interface CursoHubSalonCurso {
	cursoId: number;
	nombre: string;
}

/** Resumen del salón de un par (curso, salón): no depende de la franja elegida. */
export interface CursoHubSalonSummary {
	salonId: number;
	salonDescripcion: string;
	cantidadEstudiantes: number;
	/** Cursos del usuario en este salón, sin repetir y por nombre. */
	cursos: CursoHubSalonCurso[];
}
// #endregion

// #region Summary
/**
 * Resume el salón a partir de los horarios del usuario (ya cargados por el shell).
 * `null` si el usuario no tiene horarios en ese salón. El conteo de estudiantes
 * es el mismo en todas las franjas del salón, por eso se toma de la primera.
 */
export function buildCursoHubSalonSummary(
	horarios: readonly HorarioProfesorDto[],
	salonId: number,
): CursoHubSalonSummary | null {
	const inSalon = horarios.filter((h) => h.salonId === salonId);
	if (inSalon.length === 0) return null;

	const cursos = new Map<number, CursoHubSalonCurso>();
	for (const h of inSalon) {
		if (!cursos.has(h.cursoId)) cursos.set(h.cursoId, { cursoId: h.cursoId, nombre: h.cursoNombre });
	}

	return {
		salonId,
		salonDescripcion: inSalon[0].salonDescripcion,
		cantidadEstudiantes: inSalon[0].cantidadEstudiantes,
		cursos: [...cursos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
	};
}

/** Igualdad estructural: cambiar de franja re-evalúa el resumen pero no debe re-emitirlo. */
export function isSameCursoHubSalonSummary(a: CursoHubSalonSummary | null, b: CursoHubSalonSummary | null): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	return (
		a.salonId === b.salonId &&
		a.salonDescripcion === b.salonDescripcion &&
		a.cantidadEstudiantes === b.cantidadEstudiantes &&
		a.cursos.length === b.cursos.length &&
		a.cursos.every((c, i) => c.cursoId === b.cursos[i].cursoId && c.nombre === b.cursos[i].nombre)
	);
}
// #endregion

// #region Links
/** Página de Salones del rol; con `horarioId` abre el diálogo del salón de esa franja. */
export function buildSalonesPageTarget(rol: CursoHubRol, horarioId: number): CursoHubTarget {
	return { commands: ['/intranet', rol, 'salones'], queryParams: { horarioId } };
}
// #endregion
