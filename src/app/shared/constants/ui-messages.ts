// #region Implementation
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

export const UI_SUMMARIES = {
	error: 'Error',
	success: 'Éxito',
	accessDenied: 'Acceso denegado',
	scheduleConflict: 'Conflicto de horario',
	validationError: 'Error de validación',
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
	loadHorariosSalon: 'No se pudieron cargar los horarios del salón',
	loadHorariosProfesor: 'No se pudieron cargar los horarios del profesor',
	horarioNotFound: 'No se encontró el horario',
	horarioDetailLoad: 'No se pudo cargar el detalle del horario',
	horarioEstadoChange: 'No se pudo cambiar el estado del horario',
	horarioConflict: 'Ya existe un horario que se superpone en el mismo salón',
	loadProfesorData: 'No se pudieron cargar los datos del profesor',
	loadEstudiantesSalon: 'No se pudieron cargar los estudiantes del salón',
	loadSchedule: 'No se pudo cargar el horario del día',
	loadContenido: 'No se pudo cargar el contenido del curso',
	loadVistasRol: 'No se pudieron cargar las vistas del rol',
	searchUsuarios: 'No se pudieron buscar los usuarios',
	refreshData: 'No se pudieron actualizar los datos',
} as const;

export const UI_ADMIN_ERROR_DETAILS_DYNAMIC = {
	horarioActionNotFound: (accion: string): string =>
		`No se pudo ${accion}: registro no encontrado`,
	horarioValidation: (mensaje: string): string => `Datos inválidos: ${mensaje}`,
	horarioActionFailed: (accion: string): string => `No se pudo ${accion} el horario`,
	uploadFileFailed: (errorMsg: string): string => `No se pudo subir el archivo: ${errorMsg}`,
} as const;

export const UI_HORARIOS_SUCCESS_MESSAGES = {
	created: 'Horario creado correctamente',
	updated: 'Horario actualizado correctamente',
	deleted: 'Horario eliminado correctamente',
	profesorAssigned: 'Profesor asignado correctamente',
	estudiantesAssigned: 'Estudiantes asignados correctamente',
	todosEstudiantesAssigned: 'Todos los estudiantes del salón fueron asignados',
	profesorUnassigned: 'Profesor desasignado correctamente',
	estudianteUnassigned: 'Estudiante desasignado del horario correctamente',
} as const;

export const UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC = {
	toggleEstado: (activo: boolean): string =>
		`Horario ${activo ? 'activado' : 'desactivado'} correctamente`,
} as const;

export const UI_HORARIOS_CONFIRM_MESSAGES = {
	assignAllEstudiantes: '¿Asignar todos los estudiantes del salón a este horario?',
	unassignProfesor: '¿Desasignar al profesor de este horario?',
	unassignEstudiante: '¿Desasignar a este estudiante del horario?',
} as const;

export const UI_ATTACHMENT_MESSAGES = {
	uploadSuccess: 'Archivo subido correctamente',
	fileMissing: 'No se seleccionó ningún archivo',
	fileEmpty: 'El archivo está vacío',
	fileTooLarge: (maxMb: number): string =>
		`El archivo es demasiado grande (máximo ${maxMb}MB)`,
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
	loginTooManyAttempts: 'Demasiados intentos fallidos. Intente más tarde.',
	loginError: 'Error al iniciar sesión',
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
		'Error de red. Verifica tu conexión a internet y que uses HTTPS.',
	micPermissionDenied:
		'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.',
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
	409: 'Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.',
	429: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.',
	500: 'Error interno del servidor. Intente mas tarde.',
	502: 'El servidor no esta disponible temporalmente.',
	503: 'Servicio no disponible. Intente mas tarde.',
	504: 'El servidor no responde. Intente mas tarde.',
};

/**
 * Mapeo de errorCode del backend → mensaje amigable en español.
 * El frontend traduce por código estable, no por strings del server.
 * Agregar nuevos códigos aquí conforme se usen en el backend.
 */
export const UI_ERROR_CODES: Record<string, string> = {
	// Concurrencia
	CONCURRENCY_CONFLICT:
		'El registro fue modificado por otro usuario. Recargue los datos e intente nuevamente.',

	// Auth
	AUTH_INVALID_CREDENTIALS: 'Credenciales inválidas.',
	AUTH_TOKEN_EXPIRED: 'Su sesión ha expirado. Inicie sesión nuevamente.',
	AUTH_TOKEN_INVALID: 'Token inválido.',
	AUTH_REFRESH_NOT_FOUND: 'Sesión no encontrada. Inicie sesión nuevamente.',
	AUTH_REFRESH_INVALID: 'Sesión inválida. Inicie sesión nuevamente.',
	AUTH_SESSION_NOT_FOUND: 'Sesión no encontrada o expirada.',
	AUTH_SESSION_DEVICE_MISMATCH: 'La sesión no pertenece a este dispositivo.',
	AUTH_SESSION_NETWORK_CHANGED:
		'La sesión fue invalidada por cambio de red. Inicie sesión nuevamente.',
	AUTH_ROL_INVALIDO: 'Rol inválido.',
	AUTH_USER_NOT_IDENTIFIED: 'No se pudo identificar al usuario.',
	AUTH_PROFESOR_NOT_IDENTIFIED: 'No se pudo identificar al profesor.',
	AUTH_ESTUDIANTE_NOT_IDENTIFIED: 'No se pudo identificar al estudiante.',

	// Usuarios
	DNI_DUPLICADO: 'Ya existe un usuario con ese DNI.',
	EMAIL_DUPLICADO: 'Ya existe un usuario con ese correo electrónico.',
	ROL_INVALIDO: 'Rol no válido.',
	USUARIO_NOT_FOUND: 'No se encontró el usuario solicitado.',
	USUARIO_ID_INVALIDO: 'ID de usuario inválido.',
	ESTUDIANTE_NOT_FOUND: 'No se encontró el estudiante solicitado.',
	PROFESOR_NOT_FOUND: 'No se encontró el profesor solicitado.',
	DIRECTOR_NOT_FOUND: 'No se encontró el director solicitado.',
	APODERADO_NOT_FOUND: 'No se encontró el apoderado solicitado.',
	APODERADO_YA_ASIGNADO: 'El apoderado ya está asignado a este estudiante.',

	// Horarios
	HORARIO_OVERLAP: 'Ya existe un horario que se superpone en el mismo salón.',
	HORARIO_NOT_FOUND: 'No se encontró el horario solicitado.',
	HORARIO_DIA_INVALIDO: 'Día de la semana inválido (debe ser 1-7).',
	HORARIO_ENTITY_ID_INVALIDO: 'EntityId inválido.',
	HORARIO_ID_MISMATCH: 'El ID de la URL no coincide con el ID del DTO.',
	HORARIO_USUARIO_REG_REQUERIDO: 'El parámetro usuarioReg es requerido.',
	HORARIO_USUARIO_MOD_REQUERIDO: 'El parámetro usuarioMod es requerido.',
	HORARIO_ACCESS_DENIED: 'No tiene acceso a este horario.',

	// Cursos
	CURSO_NOT_FOUND: 'No se encontró el curso solicitado.',
	CURSO_DUPLICADO: 'Ya existe un curso con ese nombre.',

	// Salones
	SALON_NOT_FOUND: 'No se encontró el salón solicitado.',
	SALON_NO_EXISTE: 'El salón no existe.',
	PROFESOR_SALON_YA_ASIGNADO:
		'El profesor ya tiene un salón asignado. Debe actualizar la asignación existente.',
	PROFESOR_SALON_NOT_FOUND:
		'No se encontró una asignación de salón para este profesor.',

	// Contenido
	CONTENIDO_NOT_FOUND: 'No se encontró el contenido solicitado.',
	CONTENIDO_DUPLICADO: 'Ya existe contenido para este horario.',
	CONTENIDO_ACCESS_DENIED: 'No tiene acceso a este contenido.',
	SEMANA_NOT_FOUND: 'No se encontró la semana solicitada.',
	SEMANA_ACCESS_DENIED: 'No tiene acceso a esta semana.',
	ARCHIVO_NOT_FOUND: 'No se encontró el archivo solicitado.',
	ARCHIVO_ACCESS_DENIED: 'No tiene acceso a este archivo.',
	TAREA_NOT_FOUND: 'No se encontró la tarea solicitada.',
	TAREA_ACCESS_DENIED: 'No tiene acceso a esta tarea.',

	// Calificaciones
	EVALUACION_NOT_FOUND: 'No se encontró la evaluación solicitada.',
	EVALUACION_TIPO_SIN_CAMBIO: 'La evaluación ya es del tipo solicitado.',
	EVALUACION_TIPO_INVALIDO: 'Tipo de evaluación inválido.',
	EVALUACION_PESO_INVALIDO: 'El peso está fuera del rango válido.',
	EVALUACION_NOTA_INVALIDA: 'La nota está fuera del rango válido.',
	EVALUACION_ACCESS_DENIED: 'No tiene acceso a esta evaluación.',
	NOTA_NOT_FOUND: 'No se encontró la nota solicitada.',
	PERIODO_NOT_FOUND: 'No se encontró el periodo solicitado.',
	PERIODO_ACCESS_DENIED: 'No tiene acceso a este periodo.',
	PERIODO_SEMANA_RANGO_INVALIDO:
		'La semana de fin debe ser mayor o igual a la semana de inicio.',

	// Grupos
	GRUPO_NOT_FOUND: 'No se encontró el grupo solicitado.',
	GRUPO_ESTUDIANTE_NOT_FOUND: 'Estudiante no encontrado en este grupo.',
	GRUPO_MAX_MINIMO: 'El máximo de estudiantes por grupo debe ser al menos 1.',
	GRUPO_EVALUACION_NO_GRUPAL: 'Esta evaluación no es grupal.',
	GRUPO_LIMITE_ALCANZADO: 'Se alcanzó el límite de miembros del grupo.',
	GRUPO_NOMBRE_DUPLICADO: 'El estudiante ya pertenece a un grupo.',

	// Permisos
	VISTA_NOT_FOUND: 'No se encontró la vista solicitada.',
	VISTA_RUTA_DUPLICADA: 'Ya existe una vista con esta ruta.',
	PERMISO_USUARIO_NOT_FOUND: 'No se encontró el permiso de usuario.',
	PERMISO_USUARIO_DUPLICADO:
		'Ya existe un permiso configurado para este usuario con este rol.',
	PERMISO_ROL_NOT_FOUND: 'No se encontró el permiso de rol.',
	PERMISO_ROL_DUPLICADO: 'Ya existe un permiso configurado para este rol.',

	// Asistencia
	ASISTENCIA_HORARIO_NOT_FOUND: 'No se encontró el horario de asistencia.',
	ASISTENCIA_HORARIO_ACCESS_DENIED: 'No tiene acceso a este horario.',
	ASISTENCIA_PAYLOAD_INVALIDO: 'Estructura de datos inválida.',
	ASISTENCIA_FIRMA_INVALIDA: 'Firma inválida.',
	ASISTENCIA_SEDE_NOT_FOUND: 'SedeId no encontrado en el token.',
	ASISTENCIA_JUSTIFICACION_ERROR: 'Error al guardar la justificación.',

	// Conversaciones
	CONVERSACION_NOT_FOUND: 'No se encontró la conversación.',
	CONVERSACION_ACCESS_DENIED: 'No es participante de esta conversación.',

	// Blob Storage
	BLOB_ARCHIVO_REQUERIDO: 'No se ha proporcionado un archivo.',
	BLOB_CONTAINER_REQUERIDO: 'Debe especificar el nombre del container.',
	BLOB_TIPO_NO_PERMITIDO: 'Tipo de archivo no permitido.',
	BLOB_TAMANO_EXCEDIDO: 'El archivo excede el tamaño máximo permitido.',

	// Genéricos
	ACCESS_DENIED: 'No tiene acceso a este recurso.',
	VALIDATION_ERROR: 'Los datos enviados no son válidos.',
	RESOURCE_NOT_FOUND: 'El recurso solicitado no fue encontrado.',
	DUPLICATE_RESOURCE: 'Ya existe un registro con esos datos.',
};
// #endregion
