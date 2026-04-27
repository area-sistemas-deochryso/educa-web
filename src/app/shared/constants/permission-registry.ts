/**
 * Catálogo centralizado de rutas de permiso.
 *
 * Regla del sistema: tener permiso a 'intranet' NO da acceso a 'intranet/admin'.
 * Cada ruta es una hoja verificada por exact match.
 *
 * Antes: magic strings dispersos en menu config, guards, y componentes.
 * Ahora: un catálogo tipado y auditable.
 */
export const PERMISOS = {
	// #region Raíz
	INTRANET: 'intranet',
	// #endregion

	// #region Asistencia
	ASISTENCIA: 'intranet/asistencia',
	// #endregion

	// #region Admin - Configuración
	ADMIN_PERMISOS_ROLES: 'intranet/admin/permisos/roles',
	ADMIN_PERMISOS_USUARIOS: 'intranet/admin/permisos/usuarios',
	ADMIN_USUARIOS: 'intranet/admin/usuarios',
	ADMIN_VISTAS: 'intranet/admin/vistas',
	// #endregion

	// #region Admin - Gestión Académica
	ADMIN_ASISTENCIAS: 'intranet/admin/asistencias',
	ADMIN_PERMISOS_SALUD: 'intranet/admin/permisos-salud',
	ADMIN_MONITOREO: 'intranet/admin/monitoreo',
	ADMIN_EMAIL_OUTBOX: 'intranet/admin/monitoreo/correos/bandeja',
	ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA: 'intranet/admin/monitoreo/correos/dashboard',
	ADMIN_EMAIL_OUTBOX_DIAGNOSTICO: 'intranet/admin/monitoreo/correos/diagnostico',
	ADMIN_AUDITORIA_CORREOS: 'intranet/admin/monitoreo/correos/auditoria',
	ADMIN_ERROR_LOGS: 'intranet/admin/monitoreo/incidencias/errores',
	ADMIN_REPORTES_USUARIO: 'intranet/admin/monitoreo/incidencias/reportes',
	ADMIN_RATE_LIMIT_EVENTS: 'intranet/admin/monitoreo/seguridad/rate-limit',
	ADMIN_CAMPUS: 'intranet/admin/campus',
	ADMIN_CURSOS: 'intranet/admin/cursos',
	ADMIN_EVENTOS_CALENDARIO: 'intranet/admin/eventos-calendario',
	ADMIN_HORARIOS: 'intranet/admin/horarios',
	ADMIN_NOTIFICACIONES: 'intranet/admin/notificaciones',
	ADMIN_SALONES: 'intranet/admin/salones',
	// #endregion

	// #region Estudiante
	ESTUDIANTE_HORARIOS: 'intranet/estudiante/horarios',
	ESTUDIANTE_CURSOS: 'intranet/estudiante/cursos',
	ESTUDIANTE_NOTAS: 'intranet/estudiante/notas',
	ESTUDIANTE_ASISTENCIA: 'intranet/estudiante/asistencia',
	ESTUDIANTE_FORO: 'intranet/estudiante/foro',
	ESTUDIANTE_MENSAJERIA: 'intranet/estudiante/mensajeria',
	ESTUDIANTE_SALONES: 'intranet/estudiante/salones',
	// #endregion

	// #region Profesor
	PROFESOR_HORARIOS: 'intranet/profesor/horarios',
	PROFESOR_CURSOS: 'intranet/profesor/cursos',
	PROFESOR_CALIFICACIONES: 'intranet/profesor/calificaciones',
	PROFESOR_ASISTENCIA: 'intranet/profesor/asistencia',
	PROFESOR_FORO: 'intranet/profesor/foro',
	PROFESOR_MENSAJERIA: 'intranet/profesor/mensajeria',
	PROFESOR_SALONES: 'intranet/profesor/salones',
	PROFESOR_FINAL_SALONES: 'intranet/profesor/final-salones',
	// #endregion

	// #region Compartido
	CALENDARIO: 'intranet/calendario',
	VIDEOCONFERENCIAS: 'intranet/videoconferencias',
	CTEST_K6: 'intranet/ctest-k6',
	// #endregion
} as const;

export type PermisoPath = (typeof PERMISOS)[keyof typeof PERMISOS];

/**
 * Todas las rutas de permiso como array.
 * Útil para validación o auditoría.
 */
export const ALL_PERMISOS: PermisoPath[] = Object.values(PERMISOS);
