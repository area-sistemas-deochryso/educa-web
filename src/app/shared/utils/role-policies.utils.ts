import { APP_USER_ROLES, type AppUserRoleValue } from '@app/shared/constants';
import { type RolPolicy } from '@shared/models/role-policies.models';
import { getRolLookup } from '@data/models';

// #region Policy Registry

/**
 * Catálogo explícito de políticas por rol.
 *
 * Flags that overlap with the Rol table (isAdmin↔esStaff, requiresSalon↔requiereSalon)
 * are enriched at runtime via getRolPolicy() when the endpoint cache is available.
 * FE-only flags (canModerateVideoconference, canEditPassword, canBeTutor, etc.)
 * remain hardcoded here until the BE exposes them.
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
	[APP_USER_ROLES.Promotor]: {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	[APP_USER_ROLES.CoordinadorAcademico]: {
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
 */
export function getRolPolicy(rol: string | undefined): RolPolicy {
	if (!rol) return DEFAULT_POLICY;
	const base = ROLE_POLICIES[rol as AppUserRoleValue] ?? DEFAULT_POLICY;

	const endpoint = getRolLookup()?.byNombre(rol);
	if (!endpoint) return base;

	// Enrich overlapping flags from endpoint, keeping FE-only flags from the hardcoded table
	return {
		...base,
		/** @deprecated 2026-06-08 — isAdmin derives from Rol.esStaff. Remove nombre check after 2026-07-08. */
		isAdmin: base.isAdmin || endpoint.esStaff,
		/** @deprecated 2026-06-08 — requiresSalon derives from Rol.requiereSalon. Remove nombre check after 2026-07-08. */
		requiresSalon: base.requiresSalon || endpoint.requiereSalon,
	};
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
