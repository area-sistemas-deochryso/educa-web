// #region Confirm dialog message builders

export const buildDeletePermisosUsuarioMessage = (nombre: string, rol: string): string => {
	return [
		`¿Está seguro de eliminar los permisos personalizados de "${nombre}"?`,
		`El usuario seguirá teniendo los permisos de su rol "${rol}".`,
	].join('\n\n');
};

export const buildDeleteHorarioMessage = (
	cursoNombre: string,
	diaSemanaDescripcion: string,
	horaInicio: string,
	horaFin: string,
): string => {
	return `¿Está seguro de eliminar el horario de ${cursoNombre} (${diaSemanaDescripcion} ${horaInicio}-${horaFin})?`;
};

export const buildDeletePermisoRolMessage = (rol: string): string => {
	return `¿Está seguro de eliminar los permisos del rol "${rol}"?`;
};

export const buildDeleteVistaMessage = (nombre: string): string => {
	return `¿Está seguro de eliminar la vista "${nombre}"?`;
};

export const buildDeleteCursoMessage = (nombre: string): string => {
	return `¿Está seguro de eliminar el curso "${nombre}"?`;
};

export const buildToggleUsuarioMessage = (nombre: string, estadoActual: boolean): string => {
	return `¿Está seguro de ${estadoActual ? 'desactivar' : 'activar'} al usuario "${nombre}"?`;
};

export const buildToggleHorarioMessage = (accion: string): string => {
	return `¿Está seguro de ${accion} este horario?`;
};

// #endregion

// #region Confirm dialog constants

export const UI_CONFIRM_HEADERS = {
	delete: 'Confirmar Eliminación',
	assign: 'Confirmar Asignación',
	activateUser: 'Activar Usuario',
	deactivateUser: 'Desactivar Usuario',
	activateHorario: 'Activar Horario',
	deactivateHorario: 'Desactivar Horario',
} as const;

export const UI_CONFIRM_LABELS = {
	yes: 'Sí',
	no: 'No',
	cancel: 'Cancelar',
	yesDelete: 'Sí, eliminar',
	yesAssignAll: 'Sí, asignar todos',
} as const;

export const UI_HORARIOS_CONFIRM_MESSAGES = {
	assignAllEstudiantes: '¿Asignar todos los estudiantes del salón a este horario?',
	unassignProfesor: '¿Desasignar al profesor de este horario?',
	unassignEstudiante: '¿Desasignar a este estudiante del horario?',
} as const;

// #endregion
