export const APP_USER_ROLES = {
	Director: 'Director',
	Profesor: 'Profesor',
	Apoderado: 'Apoderado',
	Estudiante: 'Estudiante',
	AsistenteAdministrativo: 'Asistente Administrativo',
} as const;

export type AppUserRole = (typeof APP_USER_ROLES)[keyof typeof APP_USER_ROLES] | '';
export type AppUserRoleValue = Exclude<AppUserRole, ''>;

export type AppUserRoleAdmin =
	| typeof APP_USER_ROLES.Director
	| typeof APP_USER_ROLES.Profesor
	| typeof APP_USER_ROLES.Estudiante
	| typeof APP_USER_ROLES.AsistenteAdministrativo;

export const APP_USER_ROLE_LIST: AppUserRoleValue[] = [
	APP_USER_ROLES.Director,
	APP_USER_ROLES.Profesor,
	APP_USER_ROLES.Apoderado,
	APP_USER_ROLES.Estudiante,
	APP_USER_ROLES.AsistenteAdministrativo,
];

export const APP_USER_ROLE_ADMIN_LIST: AppUserRoleAdmin[] = [
	APP_USER_ROLES.Director,
	APP_USER_ROLES.Profesor,
	APP_USER_ROLES.Estudiante,
	APP_USER_ROLES.AsistenteAdministrativo,
];
