// #region Implementation
export const APP_USER_ROLES = {
	Director: 'Director',
	Profesor: 'Profesor',
	Apoderado: 'Apoderado',
	Estudiante: 'Estudiante',
	AsistenteAdministrativo: 'Asistente Administrativo',
	Promotor: 'Promotor',
	CoordinadorAcademico: 'Coordinador Académico',
} as const;

export type AppUserRole = (typeof APP_USER_ROLES)[keyof typeof APP_USER_ROLES] | '';
export type AppUserRoleValue = Exclude<AppUserRole, ''>;

/**
 * Roles administrativos: con jurisdicción para gestionar otros usuarios y
 * operar vistas de admin (ej: asistencia de profesores, cierre mensual).
 * Director + los 3 administrativos no-Director.
 */
export type AppUserRoleAdmin =
	| typeof APP_USER_ROLES.Director
	| typeof APP_USER_ROLES.AsistenteAdministrativo
	| typeof APP_USER_ROLES.Promotor
	| typeof APP_USER_ROLES.CoordinadorAcademico;

export const APP_USER_ROLE_LIST: AppUserRoleValue[] = [
	APP_USER_ROLES.Director,
	APP_USER_ROLES.Profesor,
	APP_USER_ROLES.Apoderado,
	APP_USER_ROLES.Estudiante,
	APP_USER_ROLES.AsistenteAdministrativo,
	APP_USER_ROLES.Promotor,
	APP_USER_ROLES.CoordinadorAcademico,
];

/**
 * Lista de roles administrativos (solo Director + 3 no-Director).
 * Usar para guards de jurisdicción (INV-AD06, submenús de admin, etc.).
 * NO usar para dropdowns de "roles disponibles para asignar" — para eso usar
 * `APP_USER_ROLE_LIST`.
 */
export const APP_USER_ROLE_ADMIN_LIST: AppUserRoleAdmin[] = [
	APP_USER_ROLES.Director,
	APP_USER_ROLES.AsistenteAdministrativo,
	APP_USER_ROLES.Promotor,
	APP_USER_ROLES.CoordinadorAcademico,
];
// #endregion
