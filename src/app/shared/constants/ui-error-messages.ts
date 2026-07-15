// #region Error summaries and generic messages

export const UI_SUMMARIES = {
	error: 'Error',
	success: 'Éxito',
	accessDenied: 'Acceso denegado',
	scheduleConflict: 'Conflicto de horario',
	validationError: 'Error de validación',
	conflict: 'Conflicto',
} as const;

export const UI_ERROR_SUMMARIES = {
	connection: 'Error de conexion',
	application: 'Error de aplicacion',
	validation: 'Error de validacion',
	generic: 'Error',
} as const;

export const UI_ACCESS_DENIED_MESSAGE =
	'No cuenta con los permisos suficientes para acceder a esta vista.';

export const UI_CLIENT_ERROR_MESSAGE =
	'Ha ocurrido un error inesperado. Por favor, recargue la pagina.';

export const UI_GENERIC_MESSAGES = {
	unknownError: 'Error desconocido',
} as const;

// #endregion

// #region HTTP error messages

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

// #endregion

// #region Backend error codes

/**
 * Mapeo de errorCode del backend → mensaje amigable en español.
 * El frontend traduce por código estable, no por strings del server.
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
	AUTH_INVALID_ROLE: 'Rol inválido para este flujo de autenticación.',
	AUTH_PASSWORD_INVALID: 'Contraseña incorrecta.',
	AUTH_SESSION_USER_INACTIVE: 'El usuario asociado a esta sesión está inactivo.',
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
	SEDE_REQUIRED: 'Debe seleccionar una sede.',
	PROFESOR_TUTOR_SIN_REEMPLAZO:
		'No se puede quitar al profesor como tutor sin asignar un reemplazo.',
	DUPLICATE_NAME_MATCH: 'Ya existe un usuario con nombre y apellido similares en esta sede.',
	GRADO_INVALIDO: 'Grado inválido.',
	ESTUDIANTE_SALON_NOT_FOUND:
		'No se encontró la asignación de salón para este estudiante.',
	MOTIVO_RETIRO_INVALIDO: 'Motivo de retiro inválido.',
	'INV-U01': 'El estudiante ya tiene un salón activo asignado para este año.',
	PROFESOR_CURSO_NOT_FOUND: 'No se encontró la asignación de profesor a este curso.',
	PROFESOR_CURSO_YA_INACTIVO: 'La asignación del profesor a este curso ya está inactiva.',
	INV_AS06_TUTOR_PLENO_ASIGNACION:
		'La asignación en un salón de tutor pleno debe quedar marcada como tutor.',
	PERIODOACADEMICO_TRANSICION_INVALIDA:
		'Transición de estado del periodo académico inválida.',

	// Horarios
	HORARIO_NOT_FOUND: 'No se encontró el horario solicitado.',
	HORARIO_DIA_INVALIDO: 'Día de la semana inválido (debe ser 1-7).',
	HORARIO_ID_MISMATCH: 'El ID de la URL no coincide con el ID del DTO.',
	HORARIO_USUARIO_REG_REQUERIDO: 'El parámetro usuarioReg es requerido.',
	HORARIO_USUARIO_MOD_REQUERIDO: 'El parámetro usuarioMod es requerido.',
	HORARIO_ACCESS_DENIED: 'No tiene acceso a este horario.',
	HORARIO_RANGO_INVALIDO: 'El rango horario es inválido.',
	HORARIO_DURACION_INVALIDA: 'La duración del horario es inválida.',
	HORARIO_SIN_ESTUDIANTES: 'El horario no tiene estudiantes asignados.',
	HORARIO_CRUCE_SALON: 'El horario se cruza con otro horario existente en el mismo salón.',
	HORARIO_CRUCE_PROFESOR: 'El profesor ya tiene un horario asignado en ese mismo rango.',
	HORARIO_CRUCE_ESTUDIANTE:
		'Un estudiante ya tiene un horario asignado en ese mismo rango.',
	HORARIO_PROFESOR_NOT_ASSIGNED: 'El profesor no está asignado a este horario.',
	ESTUDIANTE_NO_ASIGNADO: 'El estudiante no está asignado a este horario.',
	INV_AS01_TUTOR_PLENO:
		'En este salón (tutor pleno), el profesor del horario debe ser el tutor asignado.',
	INV_AS02_PROFESOR_CURSO:
		'El profesor no tiene asignación activa a este curso. Asigne primero el curso al profesor en Usuarios.',
	SALON_TUTOR_PLENO_CON_HORARIOS:
		'No se puede eliminar el salón porque tiene horarios activos en modo tutor pleno.',

	// Cursos
	CURSO_NOT_FOUND: 'No se encontró el curso solicitado.',
	CURSO_DUPLICADO: 'Ya existe un curso con ese nombre.',
	CURSO_CON_HORARIOS_ACTIVOS: 'No se puede eliminar el curso porque tiene horarios activos.',

	// Salones
	SALON_NOT_FOUND: 'No se encontró el salón solicitado.',
	PROFESOR_SALON_YA_ASIGNADO:
		'El profesor ya tiene un salón asignado. Debe actualizar la asignación existente.',
	PROFESOR_SALON_NOT_FOUND:
		'No se encontró una asignación de salón para este profesor.',
	SALON_DUPLICADO: 'Ya existe un salón con ese nombre.',
	SALON_YA_TIENE_TUTOR: 'El salón ya tiene un tutor asignado.',
	SALON_SIN_ESTUDIANTES: 'El salón no tiene estudiantes asignados.',
	SALON_CON_HORARIOS_DATOS_INCOMPLETOS: 'El salón tiene horarios con datos incompletos.',
	SALON_DESTINO_IGUAL_ORIGEN: 'El salón de destino no puede ser igual al de origen.',

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
	TAREA_PERIODO_CERRADO: 'No se puede modificar la tarea porque el periodo está cerrado.',

	// Calificaciones
	EVALUACION_NOT_FOUND: 'No se encontró la evaluación solicitada.',
	EVALUACION_TIPO_SIN_CAMBIO: 'La evaluación ya es del tipo solicitado.',
	EVALUACION_TIPO_INVALIDO: 'Tipo de evaluación inválido.',
	EVALUACION_PESO_INVALIDO: 'El peso está fuera del rango válido.',
	EVALUACION_NOTA_INVALIDA: 'La nota está fuera del rango válido.',
	EVALUACION_ACCESS_DENIED: 'No tiene acceso a esta evaluación.',
	EVALUACION_EDIT_WINDOW_EXCEEDED: 'Se venció la ventana de edición para esta evaluación.',
	EVALUACION_PERIODO_CERRADO:
		'No se puede modificar la evaluación porque el periodo está cerrado.',
	EVALUACION_PESO_EXCEDIDO: 'El peso total de las evaluaciones excede el máximo permitido.',
	NOTA_NOT_FOUND: 'No se encontró la nota solicitada.',
	PERIODO_NOT_FOUND: 'No se encontró el periodo solicitado.',
	PERIODO_ACCESS_DENIED: 'No tiene acceso a este periodo.',
	PERIODO_SEMANA_RANGO_INVALIDO:
		'La semana de fin debe ser mayor o igual a la semana de inicio.',
	PERIODO_NO_CERRADO: 'El periodo aún no está cerrado.',
	CALIFICACION_TRANSICION_INVALIDA: 'Transición de estado de calificación inválida.',

	// Grupos
	GRUPO_NOT_FOUND: 'No se encontró el grupo solicitado.',
	GRUPO_ESTUDIANTE_NOT_FOUND: 'Estudiante no encontrado en este grupo.',
	GRUPO_MAX_MINIMO: 'El máximo de estudiantes por grupo debe ser al menos 1.',
	GRUPO_EVALUACION_NO_GRUPAL: 'Esta evaluación no es grupal.',
	GRUPO_LIMITE_ALCANZADO: 'Se alcanzó el límite de miembros del grupo.',
	GRUPO_NOMBRE_DUPLICADO: 'El estudiante ya pertenece a un grupo.',

	// Permisos (vistas y asignaciones)
	VISTA_NOT_FOUND: 'No se encontró la vista solicitada.',
	VISTA_RUTA_DUPLICADA: 'Ya existe una vista con esta ruta.',
	PERMISO_USUARIO_NOT_FOUND: 'No se encontró el permiso de usuario.',
	PERMISO_USUARIO_DUPLICADO:
		'Este usuario ya tiene un permiso configurado para ese rol. Edítalo desde la fila correspondiente en la tabla en lugar de crear uno nuevo.',
	PERMISO_ROL_NOT_FOUND: 'No se encontró el permiso de rol.',
	PERMISO_ROL_DUPLICADO:
		'Este rol ya tiene un permiso configurado. Edítalo desde la fila correspondiente en la tabla en lugar de crear uno nuevo.',

	// Permisos (roles y capabilities — Constants/Permisos/ErrorCodes.cs)
	ROL_NOT_FOUND: 'No se encontró el rol solicitado.',
	CAPABILITY_CODIGO_EXISTS: 'Ya existe una capability con ese código.',
	CAPABILITY_NOT_FOUND: 'No se encontró la capability solicitada.',
	CAPABILITY_IN_USE: 'La capability está en uso y no puede eliminarse.',

	// Asistencia
	ASISTENCIA_HORARIO_NOT_FOUND: 'No se encontró el horario de asistencia.',
	ASISTENCIA_HORARIO_ACCESS_DENIED: 'No tiene acceso a este horario.',
	ASISTENCIA_PAYLOAD_INVALIDO: 'Estructura de datos inválida.',
	ASISTENCIA_FIRMA_INVALIDA: 'Firma inválida.',
	ASISTENCIA_SEDE_NOT_FOUND: 'SedeId no encontrado en el token.',
	ASISTENCIA_JUSTIFICACION_ERROR: 'Error al guardar la justificación.',
	SEDE_NO_ENCONTRADA: 'La sede no existe o está inactiva.',
	ASISTENCIA_DNI_NOT_FOUND: 'DNI no encontrado en el token.',
	DNI_COLISION_CROSS_TABLE: 'El DNI corresponde simultáneamente a un profesor y un estudiante.',
	PROFESOR_INACTIVO: 'El profesor está inactivo.',
	ESTUDIANTE_INACTIVO: 'El estudiante está inactivo.',
	ASISTENTE_ADMIN_NO_ENCONTRADO: 'No se encontró el asistente administrativo.',
	ASISTENTE_ADMIN_INACTIVO: 'El asistente administrativo está inactivo.',
	TIPO_PERSONA_INVALIDO: 'Tipo de persona inválido.',
	ASISTENCIA_RANGO_INVALIDO: 'El rango de fechas es inválido.',
	ASISTENCIA_FECHA_FUTURA: 'La fecha no puede ser posterior a hoy.',
	ASISTENCIA_FECHA_ANTERIOR_PERIODO: 'La fecha es anterior al inicio del periodo.',
	ASISTENCIA_ESTUDIANTE_DUPLICADO:
		'Hay un estudiante repetido en la lista de asistencia a guardar.',
	ASISTENCIA_ESTUDIANTE_NO_MATRICULADO: 'El estudiante no está matriculado en este curso.',
	ASISTENCIA_SIN_ENTRADA: 'No se registró la entrada del estudiante.',
	ASISTENCIA_YA_COMPLETA: 'La asistencia ya está completa.',
	ASISTENCIA_NO_ENCONTRADA: 'No se encontró la asistencia solicitada.',
	ASISTENCIA_DUPLICADA: 'Ya existe una asistencia registrada.',
	ASISTENCIA_CONCURRENCIA:
		'La asistencia fue modificada por otro usuario. Recargue e intente nuevamente.',
	HORA_SALIDA_INVALIDA: 'La hora de salida es inválida.',
	ASISTENCIA_MES_CERRADO: 'No se puede modificar la asistencia porque el mes está cerrado.',
	'INV-AC03': 'Todos los periodos del nivel y año están cerrados para asistencia por curso.',
	ASISTENCIA_ACCION_NO_MANEJADA: 'Acción de asistencia no reconocida.',
	CIERRE_FECHA_FUTURA: 'La fecha de cierre no puede ser posterior a hoy.',
	CIERRE_OBSERVACION_INSUFICIENTE: 'La observación del cierre es insuficiente.',
	CIERRE_NO_ENCONTRADO: 'No se encontró el cierre solicitado.',
	CIERRE_CONCURRENCIA:
		'El cierre fue modificado por otro usuario. Recargue e intente nuevamente.',
	'INV-AD06_JUSTIFICACION_PROFESOR_REQUIERE_ADMIN':
		'Solo un administrador puede justificar la asistencia de un profesor.',
	JUSTIFICACION_FECHAS_FUERA_DE_ANIO: 'Las fechas de la justificación están fuera del año escolar.',
	JUSTIFICACION_ASISTENCIA_COMPLETA: 'No se puede justificar una asistencia ya completa.',
	JUSTIFICACION_DOCUMENTO_VACIO: 'Debe adjuntar un documento de justificación.',
	JUSTIFICACION_DOCUMENTO_EXCEDE_TAMANO: 'El documento excede el tamaño máximo permitido.',
	JUSTIFICACION_FORMATO_NO_PERMITIDO: 'Formato de documento no permitido.',
	PERMISO_SALUD_SIN_REGISTRO_HOY: 'No hay registro de asistencia hoy para este permiso de salud.',
	PERMISO_SALUD_SIN_ENTRADA_REGISTRADA: 'No se registró la entrada antes de solicitar el permiso.',
	PERMISO_SALUD_SALIDA_YA_REGISTRADA: 'Ya se registró la salida por permiso de salud.',
	PERMISO_SALUD_ACTIVO_EXISTENTE: 'Ya existe un permiso de salud activo.',
	PERMISO_SALUD_SINTOMAS_INVALIDOS: 'Los síntomas indicados no son válidos.',
	PERMISO_SALUD_DETALLE_REQUERIDO: 'Debe indicar un detalle para el permiso de salud.',
	REPORTE_TIPO_PERSONA_INVALIDO: 'Tipo de persona inválido para el reporte.',
	REPORTE_FILTRO_INVALIDO: 'Filtro de reporte inválido.',
	REPORTE_RANGO_INVALIDO: 'El rango de fechas del reporte es inválido.',
	REPORTE_SALON_REQUERIDO: 'Debe seleccionar un salón para el reporte.',
	REPORTE_FORMATO_SALON_INVALIDO: 'Formato de salón inválido en el reporte.',

	// Conversaciones
	CONVERSACION_NOT_FOUND: 'No se encontró la conversación.',
	CONVERSACION_ACCESS_DENIED: 'No es participante de esta conversación.',

	// Blob Storage / Videoconferencia
	BLOB_ARCHIVO_REQUERIDO: 'No se ha proporcionado un archivo.',
	BLOB_CONTAINER_REQUERIDO: 'Debe especificar el nombre del container.',
	BLOB_TIPO_NO_PERMITIDO: 'Tipo de archivo no permitido.',
	BLOB_TAMANO_EXCEDIDO: 'El archivo excede el tamaño máximo permitido.',
	BLOB_NO_SNAPSHOT: 'No hay un snapshot disponible para este archivo.',
	VIDEOCONF_ROOM_NAME_REQUIRED: 'Debe indicar el nombre de la sala de videoconferencia.',

	// Notificaciones (email outbox, blacklist, cuarentena, pausa de dominio)
	ESTADO_NO_FAILED: 'Solo se puede reintentar un correo en estado fallido.',
	YA_ENVIADO_MANUAL: 'Este correo ya fue reenviado manualmente con éxito.',
	DESTINATARIO_BLACKLISTED: 'El destinatario está en la lista negra.',
	DESTINATARIO_QUARANTINED: 'El destinatario está en cuarentena.',
	SENDER_NO_ENCONTRADO: 'El remitente configurado no existe.',
	MOTIVO_NO_PERMITIDO_MANUAL: 'Este motivo no está permitido para altas manuales.',
	BLACKLIST_MOTIVO_REQUERIDO: 'Debe indicar un motivo para el bloqueo.',
	CORREO_INVALIDO: 'El correo electrónico tiene un formato inválido.',
	BLACKLIST_YA_DESPEJADA: 'Esta entrada ya fue despejada de la lista negra.',
	UNBLOCK_MOTIVO_CORTO: 'El motivo de desbloqueo es demasiado corto.',
	DOMINIO_INVALIDO: 'El dominio tiene un formato inválido.',

	// Sistema (grupos de error, eventos de calendario, notificaciones, reportes de usuario)
	ERROR_GROUP_NOT_FOUND: 'No se encontró el grupo de errores solicitado.',
	'INV-ET07_ESTADO_INVALIDO': 'Estado inválido para este grupo de errores.',
	'INV-ET07_ROW_VERSION_STALE':
		'El grupo de errores fue modificado por otro usuario. Recargue e intente nuevamente.',
	BACKFILL_RUNNING: 'Ya hay un backfill en ejecución.',
	EVENTO_NOT_FOUND: 'No se encontró el evento solicitado.',
	TIPO_INVALIDO: 'Tipo inválido.',
	RANGO_FECHAS_INVALIDO: 'El rango de fechas es inválido.',
	NOTIFICACION_NOT_FOUND: 'No se encontró la notificación solicitada.',
	PRIORIDAD_INVALIDA: 'Prioridad inválida.',
	REPORTE_NOT_FOUND: 'No se encontró el reporte solicitado.',
	REPORTE_TIPO_INVALIDO: 'Tipo de reporte inválido.',
	REPORTE_ESTADO_INVALIDO: 'Estado de reporte inválido.',
	TELEMETRY_BUNDLE_TOO_LARGE: 'El paquete de telemetría excede el tamaño máximo permitido.',
	REQUEST_VACIO: 'La solicitud no puede estar vacía.',

	// Dashboard email
	FECHA_FORMATO_INVALIDO: 'Formato de fecha inválido. Usa yyyy-MM-dd.',
	FECHA_FUTURA_INVALIDA: 'La fecha no puede ser posterior a hoy.',
	FECHA_DEMASIADO_ANTIGUA: 'Solo se pueden consultar los últimos 90 días.',

	// Genéricos
	ACCESS_DENIED: 'No tiene acceso a este recurso.',
	VALIDATION_ERROR: 'Los datos enviados no son válidos.',
	RESOURCE_NOT_FOUND: 'El recurso solicitado no fue encontrado.',
	DUPLICATE_RESOURCE: 'Ya existe un registro con esos datos.',
};

/**
 * Mapeo de errorCode del backend → acción correctiva accionable en el toast
 * (botón con navegación). Solo para códigos donde el usuario puede resolver
 * el problema navegando a otra pantalla — no todos los errorCode aplican.
 */
export const UI_ERROR_CODE_ACTIONS: Record<string, { label: string; route: string }> = {
	INV_AS01_TUTOR_PLENO: { label: 'Ir a Usuarios', route: '/intranet/admin/usuarios' },
	INV_AS02_PROFESOR_CURSO: { label: 'Ir a Usuarios', route: '/intranet/admin/usuarios' },
};

// #endregion
