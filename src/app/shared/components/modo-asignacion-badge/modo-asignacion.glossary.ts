import type { ModoAsignacion } from '@data/models';

// #region Implementation
/**
 * Glosario único de label + tooltip para `ModoAsignacion`.
 * Fuente centralizada — antes duplicada en salones-admin-table, salon-detail-dialog,
 * horario-detail-drawer, horarios.component y usuario-form-dialog.helpers (P84 F4).
 */
export function getModoAsignacionLabel(modo: ModoAsignacion): string {
	if (modo === 'TutorPleno') return 'Tutor pleno';
	if (modo === 'PorCurso') return 'Por curso';
	return 'Flexible';
}

export function getModoAsignacionTooltip(modo: ModoAsignacion): string {
	if (modo === 'TutorPleno')
		return 'En salones hasta 4to de Primaria, el tutor dicta todos los cursos';
	if (modo === 'PorCurso')
		return 'En salones desde 5to de Primaria, cada curso tiene un profesor asignado';
	return 'Sección vacacional: sin restricciones de asignación';
}

export function getModoAsignacionSeverity(modo: ModoAsignacion): 'info' | 'warn' | 'secondary' {
	if (modo === 'TutorPleno') return 'info';
	if (modo === 'PorCurso') return 'warn';
	return 'secondary';
}
// #endregion
