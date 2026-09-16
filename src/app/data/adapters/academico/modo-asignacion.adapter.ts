export const MODOS_ASIGNACION = ['TutorPleno', 'PorCurso', 'Flexible'] as const;
export type ModoAsignacion = (typeof MODOS_ASIGNACION)[number];

/** Umbral inclusivo: GRA_Orden ≤ 7 → TutorPleno, ≥ 8 → PorCurso, sección V → Flexible. */
export const UMBRAL_TUTOR_PLENO = 7;

/**
 * Resuelve el modo de asignación profesor-salón-curso.
 * Replica la lógica de `ModoAsignacionResolver.cs` del backend (mismo umbral hardcodeado ahí).
 */
export function resolveModoAsignacion(gradoOrden: number, seccion: string | null): ModoAsignacion {
	if (seccion?.trim().toUpperCase() === 'V') return 'Flexible';
	return gradoOrden <= UMBRAL_TUTOR_PLENO ? 'TutorPleno' : 'PorCurso';
}
