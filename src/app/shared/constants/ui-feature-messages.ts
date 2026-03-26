// #region Admin error details

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

// #endregion

// #region Horarios messages

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

// #endregion

// #region Attachment messages

export const UI_ATTACHMENT_MESSAGES = {
	uploadSuccess: 'Archivo subido correctamente',
	fileMissing: 'No se seleccionó ningún archivo',
	fileEmpty: 'El archivo está vacío',
	fileTooLarge: (maxMb: number): string =>
		`El archivo es demasiado grande (máximo ${maxMb}MB)`,
	uploadFailed: 'No se pudo subir el archivo',
	registerFailed: 'No se pudo registrar el archivo',
	deleteFailed: 'No se pudo eliminar el archivo',
	loadStudentFilesFailed: 'No se pudo cargar los archivos de estudiantes',
	loadSubmissionsFailed: 'No se pudo cargar las entregas de estudiantes',
} as const;

// #endregion

// #region Salones messages

export const UI_SALONES_SUCCESS_MESSAGES = {
	configUpdated: 'Los cambios se guardaron correctamente',
	configCreated: 'Configuración creada correctamente',
	periodoCreated: (nivel: string): string => `Periodo de ${nivel} creado correctamente`,
	periodoClosed: 'Periodo cerrado correctamente',
} as const;

export const UI_SALONES_ERROR_DETAILS = {
	updateConfig: 'No se pudo actualizar la configuración',
	createConfig: 'No se pudo crear la configuración',
	createPeriodo: 'No se pudo crear el periodo',
	closePeriodo: 'No se pudo cerrar el periodo',
	loadAprobaciones: 'No se pudieron cargar las aprobaciones',
	aprobarEstudiante: 'No se pudo completar la aprobación',
	aprobarMasivo: 'No se pudo completar la aprobación masiva',
} as const;

export const UI_SALONES_CONFIRM_HEADERS = {
	configCreated: 'Configuración creada',
	configUpdated: 'Configuración actualizada',
	periodoCreated: 'Periodo creado',
	aprobacionMasiva: 'Aprobación masiva completada',
} as const;

// #endregion

// #region Asistencia messages

export const UI_ASISTENCIA_SUCCESS_MESSAGES = {
	registered: 'Asistencia registrada exitosamente',
} as const;

// #endregion

// #region Permisos messages

export const UI_PERMISOS_SUCCESS_DETAILS = {
	updated: 'Permisos actualizados',
	created: 'Permisos creados',
	deleted: 'Permiso eliminado',
} as const;

// #endregion

// #region Estudiante messages

export const UI_ESTUDIANTE_ERROR_DETAILS = {
	loadCursos: 'No se pudieron cargar los cursos',
	loadContenido: 'No se pudo cargar el contenido del curso',
} as const;

// #endregion

// #region Auth & Login messages

export const UI_AUTH_MESSAGES = {
	loginTooManyAttempts: 'Demasiados intentos fallidos. Intente más tarde.',
	loginError: 'Error al iniciar sesión',
} as const;

export const UI_LOGIN_MESSAGES = {
	formInvalid: 'Por favor, corrija los errores en el formulario',
	tooManyAttemptsRedirect:
		'Ha excedido el numero maximo de intentos. Sera redirigido...',
	invalidCredentials: (remaining: number): string =>
		`Credenciales incorrectas. Intentos restantes: ${remaining}`,
	connectionError: 'Error de conexion. Intente nuevamente.',
} as const;

// #endregion

// #region Voice messages

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

// #endregion
