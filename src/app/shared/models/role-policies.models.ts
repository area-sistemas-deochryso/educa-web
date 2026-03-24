import { APP_USER_ROLES, type AppUserRoleValue } from '@app/shared/constants';

// #region Types

/**
 * Capacidades de un rol en el sistema.
 * Cada propiedad responde una pregunta de negocio concreta.
 *
 * Regla: toda decisión basada en rol debe consultarse aquí,
 * NO dispersarse en if/else por el codebase.
 */
export interface RolPolicy {
	/** ¿Puede moderar videoconferencias (Jitsi)? */
	readonly canModerateVideoconference: boolean;
	/** ¿Es rol administrativo (acceso a gestión completa)? */
	readonly isAdmin: boolean;
	/** ¿Puede editar contraseñas de otros usuarios? */
	readonly canEditPassword: boolean;
	/** ¿Requiere asignación de salón? */
	readonly requiresSalon: boolean;
	/** ¿Puede ser tutor de un salón? */
	readonly canBeTutor: boolean;
	/** ¿Tiene entityId propio (profesor/estudiante con registro)? */
	readonly hasEntityId: boolean;
	/** Estrategia de carga de horarios por rol */
	readonly horarioEndpoint: 'all' | 'by-profesor' | 'mis-horarios';
	/** Grupo de permisos de menú (qué sección del menú ve) */
	readonly menuGroup: 'admin' | 'profesor' | 'estudiante' | 'apoderado';
}

// #endregion

// #region Policy Registry

/**
 * Catálogo explícito de políticas por rol.
 *
 * Antes: if/else dispersos en 8+ archivos.
 * Ahora: una tabla de verdad auditable.
 */
const ROLE_POLICIES: Record<AppUserRoleValue, RolPolicy> = {
	[APP_USER_ROLES.Director]: {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	[APP_USER_ROLES.AsistenteAdministrativo]: {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	[APP_USER_ROLES.Profesor]: {
		canModerateVideoconference: true,
		isAdmin: false,
		canEditPassword: false,
		requiresSalon: true,
		canBeTutor: true,
		hasEntityId: true,
		horarioEndpoint: 'by-profesor',
		menuGroup: 'profesor',
	},
	[APP_USER_ROLES.Apoderado]: {
		canModerateVideoconference: false,
		isAdmin: false,
		canEditPassword: false,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'apoderado',
	},
	[APP_USER_ROLES.Estudiante]: {
		canModerateVideoconference: false,
		isAdmin: false,
		canEditPassword: false,
		requiresSalon: true,
		canBeTutor: false,
		hasEntityId: true,
		horarioEndpoint: 'mis-horarios',
		menuGroup: 'estudiante',
	},
};

/**
 * Policy por defecto para roles no reconocidos.
 * Principio de mínimo privilegio.
 */
const DEFAULT_POLICY: RolPolicy = {
	canModerateVideoconference: false,
	isAdmin: false,
	canEditPassword: false,
	requiresSalon: false,
	canBeTutor: false,
	hasEntityId: false,
	horarioEndpoint: 'all',
	menuGroup: 'estudiante',
};

// #endregion

// #region Public API

/**
 * Obtiene la política completa de un rol.
 *
 * @example
 * const policy = getRolPolicy('Director');
 * if (policy.isAdmin) { ... }
 * if (policy.canModerateVideoconference) { ... }
 */
export function getRolPolicy(rol: string | undefined): RolPolicy {
	if (!rol) return DEFAULT_POLICY;
	return ROLE_POLICIES[rol as AppUserRoleValue] ?? DEFAULT_POLICY;
}

/**
 * Predicados de conveniencia para uso directo.
 * Cada uno consulta la tabla de políticas, NO hardcodea roles.
 */
export function isAdminRole(rol: string | undefined): boolean {
	return getRolPolicy(rol).isAdmin;
}

export function canModerateVideoconference(rol: string | undefined): boolean {
	return getRolPolicy(rol).canModerateVideoconference;
}

export function canEditPassword(rol: string | undefined): boolean {
	return getRolPolicy(rol).canEditPassword;
}

export function rolRequiereSalonPolicy(rol: string | undefined): boolean {
	return getRolPolicy(rol).requiresSalon;
}

export function rolPermiteEsTutorPolicy(rol: string | undefined): boolean {
	return getRolPolicy(rol).canBeTutor;
}

export function getHorarioEndpoint(rol: string | undefined): RolPolicy['horarioEndpoint'] {
	return getRolPolicy(rol).horarioEndpoint;
}

// #endregion
