import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

// #region Types
/** Roles que tienen hub de curso (admin y apoderado quedan fuera de D1). */
export type CursoHubRol = 'profesor' | 'estudiante';

/** Destino listo para `routerLink` / `router.navigate` (`commands` + `queryParams`). */
export interface CursoHubTarget {
	commands: (string | number)[];
	queryParams: Record<string, number>;
}

export type CursoHubHorarioRef = Pick<HorarioProfesorDto, 'id' | 'cursoId' | 'salonId'>;
// #endregion

// #region Builders
/**
 * Única fuente de la URL del hub de curso: par (curso, salón) en el path y la
 * franja (horario) como query opcional. Sin `withSlot`, el enlace apunta al par
 * y el hub resuelve la franja por preselección.
 */
export function buildCursoHubLink(
	rol: CursoHubRol,
	horario: CursoHubHorarioRef,
	options: { withSlot?: boolean } = {},
): CursoHubTarget {
	const { withSlot = true } = options;
	return {
		commands: ['/intranet', rol, 'cursos', horario.cursoId, horario.salonId],
		queryParams: withSlot ? { horarioId: horario.id } : {},
	};
}

/** Comandos de la lista de Cursos del rol (destino del redirect por par inválido). */
export function buildCursosListCommands(rol: CursoHubRol): string[] {
	return ['/intranet', rol, 'cursos'];
}
// #endregion
