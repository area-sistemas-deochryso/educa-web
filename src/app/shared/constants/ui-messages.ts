// #region Implementation
export const buildDeletePermisosUsuarioMessage = (nombre: string, rol: string): string => {
	return [
		`Â¿EstÃ¡ seguro de eliminar los permisos personalizados de "${nombre}"?`,
		`El usuario seguirÃ¡ teniendo los permisos de su rol "${rol}".`,
	].join('\n\n');
};

export const buildDeleteHorarioMessage = (
	cursoNombre: string,
	diaSemanaDescripcion: string,
	horaInicio: string,
	horaFin: string,
): string => {
	return `Â¿EstÃ¡ seguro de eliminar el horario de ${cursoNombre} (${diaSemanaDescripcion} ${horaInicio}-${horaFin})?`;
};

export const buildDeletePermisoRolMessage = (rol: string): string => {
	return `Â¿EstÃ¡ seguro de eliminar los permisos del rol "${rol}"?`;
};

export const buildDeleteVistaMessage = (nombre: string): string => {
	return `Â¿EstÃ¡ seguro de eliminar la vista "${nombre}"?`;
};

export const buildDeleteCursoMessage = (nombre: string): string => {
	return `Â¿EstÃ¡ seguro de eliminar el curso "${nombre}"?`;
};

export const buildToggleUsuarioMessage = (nombre: string, estadoActual: boolean): string => {
	return `Â¿EstÃ¡ seguro de ${estadoActual ? 'desactivar' : 'activar'} al usuario "${nombre}"?`;
};

export const buildToggleHorarioMessage = (accion: string): string => {
	return `Â¿EstÃ¡ seguro de ${accion} este horario?`;
};

export const UI_CONFIRM_HEADERS = {
	delete: 'Confirmar EliminaciÃ³n',
	assign: 'Confirmar AsignaciÃ³n',
	activateUser: 'Activar Usuario',
	deactivateUser: 'Desactivar Usuario',
	activateHorario: 'Activar Horario',
	deactivateHorario: 'Desactivar Horario',
} as const;

export const UI_CONFIRM_LABELS = {
	yes: 'SÃ­',
	no: 'No',
	cancel: 'Cancelar',
	yesDelete: 'SÃ­, eliminar',
	yesAssignAll: 'SÃ­, asignar todos',
} as const;

export const UI_SUMMARIES = {
	error: 'Error',
	success: 'Ã‰xito',
	accessDenied: 'Acceso denegado',
	scheduleConflict: 'Conflicto de horario',
	validationError: 'Error de validaciÃ³n',
} as const;

export const UI_ACCESS_DENIED_MESSAGE =
	'No cuenta con los permisos suficientes para acceder a esta vista.';

export const UI_ADMIN_ERROR_DETAILS = {
	loadPermisos: 'No se pudieron cargar los permisos',
	savePermiso: 'No se pudo guardar el permiso',
	deletePermiso: 'No se pudo eliminar el permiso',
	loadUsuarios: 'No se pudieron cargar los usuarios',
	updateUsuario: 'No se pudo actualizar el usuario',
	createUsuario: 'No se pudo crear el usuario',
	deleteUsuario: 'No se pudo eliminar el usuario',
	changeEstado: 'No se pudo cambiar el estado',
	loadVistas: 'No se pudieron cargar las vistas',
	saveVista: 'No se pudo guardar la vista',
	deleteVista: 'No se pudo eliminar la vista',
	loadCursos: 'No se pudieron cargar los cursos',
	loadGrados: 'No se pudieron cargar los grados',
	saveCurso: 'No se pudo guardar el curso',
	deleteCurso: 'No se pudo eliminar el curso',
	loadHorariosData: 'No se pudieron cargar los datos',
	loadHorariosSalon: 'No se pudieron cargar los horarios del salÃ³n',
	loadHorariosProfesor: 'No se pudieron cargar los horarios del profesor',
	horarioNotFound: 'No se encontrÃ³ el horario',
	horarioDetailLoad: 'No se pudo cargar el detalle del horario',
	horarioEstadoChange: 'No se pudo cambiar el estado del horario',
	horarioConflict: 'Ya existe un horario que se superpone en el mismo salÃ³n',
} as const;

export const UI_ADMIN_ERROR_DETAILS_DYNAMIC = {
	horarioActionNotFound: (accion: string): string =>
		`No se pudo ${accion}: registro no encontrado`,
	horarioValidation: (mensaje: string): string => `Datos invÃ¡lidos: ${mensaje}`,
	horarioActionFailed: (accion: string): string => `No se pudo ${accion} el horario`,
	uploadFileFailed: (errorMsg: string): string => `No se pudo subir el archivo: ${errorMsg}`,
} as const;

export const UI_HORARIOS_SUCCESS_MESSAGES = {
	created: 'Horario creado correctamente',
	updated: 'Horario actualizado correctamente',
	deleted: 'Horario eliminado correctamente',
	profesorAssigned: 'Profesor asignado correctamente',
	estudiantesAssigned: 'Estudiantes asignados correctamente',
	todosEstudiantesAssigned: 'Todos los estudiantes del salÃ³n fueron asignados',
} as const;

export const UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC = {
	toggleEstado: (activo: boolean): string =>
		`Horario ${activo ? 'activado' : 'desactivado'} correctamente`,
} as const;

export const UI_HORARIOS_CONFIRM_MESSAGES = {
	assignAllEstudiantes: 'Â¿Asignar todos los estudiantes del salÃ³n a este horario?',
} as const;

export const UI_ATTACHMENT_MESSAGES = {
	uploadSuccess: 'Archivo subido correctamente',
	fileMissing: 'No se seleccionÃ³ ningÃºn archivo',
	fileEmpty: 'El archivo estÃ¡ vacÃ­o',
	fileTooLarge: (maxMb: number): string =>
		`El archivo es demasiado grande (mÃ¡ximo ${maxMb}MB)`,
} as const;

export const UI_ERROR_SUMMARIES = {
	connection: 'Error de conexion',
	application: 'Error de aplicacion',
	validation: 'Error de validacion',
	generic: 'Error',
} as const;

export const UI_CLIENT_ERROR_MESSAGE =
	'Ha ocurrido un error inesperado. Por favor, recargue la pagina.';

export const UI_AUTH_MESSAGES = {
	loginTooManyAttempts: 'Demasiados intentos fallidos. Intente mÃ¡s tarde.',
	loginError: 'Error al iniciar sesiÃ³n',
} as const;

export const UI_GENERIC_MESSAGES = {
	unknownError: 'Error desconocido',
} as const;

export const UI_LOGIN_MESSAGES = {
	formInvalid: 'Por favor, corrija los errores en el formulario',
	tooManyAttemptsRedirect:
		'Ha excedido el numero maximo de intentos. Sera redirigido...',
	invalidCredentials: (remaining: number): string =>
		`Credenciales incorrectas. Intentos restantes: ${remaining}`,
	connectionError: 'Error de conexion. Intente nuevamente.',
} as const;

export const UI_VOICE_MESSAGES = {
	networkError:
		'Error de red. Verifica tu conexiÃ³n a internet y que uses HTTPS.',
	micPermissionDenied:
		'Permiso de micrÃ³fono denegado. HabilÃ­talo en la configuraciÃ³n del navegador.',
	startFailed: 'No se pudo iniciar el reconocimiento de voz.',
} as const;

export const UI_VOICE_MESSAGES_DYNAMIC = {
	genericError: (error: string): string => `Error: ${error}`,
} as const;

export const UI_HTTP_ERROR_MESSAGES: Record<number, string> = {
	0: 'No se pudo conectar con el servidor. Verifique su conexion a internet.',
	400: 'La solicitud contiene datos invalidos.',
	401: 'Su sesion ha expirado. Por favor, inicie sesion nuevamente.',
	403: 'No tiene permisos para realizar esta accion.',
	404: 'El recurso solicitado no fue encontrado.',
	408: 'La solicitud ha tardado demasiado. Intente nuevamente.',
	422: 'Los datos enviados no pudieron ser procesados.',
	429: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.',
	500: 'Error interno del servidor. Intente mas tarde.',
	502: 'El servidor no esta disponible temporalmente.',
	503: 'Servicio no disponible. Intente mas tarde.',
	504: 'El servidor no responde. Intente mas tarde.',
};
// #endregion
