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
const ROLE_POLICIES: Record<string, RolPolicy> = {
	Director: {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	'Asistente Administrativo': {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	Promotor: {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	'Coordinador Académico': {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	Administrador: {
		canModerateVideoconference: true,
		isAdmin: true,
		canEditPassword: true,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'admin',
	},
	Profesor: {
		canModerateVideoconference: true,
		isAdmin: false,
		canEditPassword: false,
		requiresSalon: true,
		canBeTutor: true,
		hasEntityId: true,
		horarioEndpoint: 'by-profesor',
		menuGroup: 'profesor',
	},
	Apoderado: {
		canModerateVideoconference: false,
		isAdmin: false,
		canEditPassword: false,
		requiresSalon: false,
		canBeTutor: false,
		hasEntityId: false,
		horarioEndpoint: 'all',
		menuGroup: 'apoderado',
	},
	Estudiante: {
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
	const base = ROLE_POLICIES[rol] ?? DEFAULT_POLICY;

	const endpoint = getRolLookup()?.byNombre(rol);
	if (!endpoint) return base;

	// Enrich overlapping flags from endpoint, keeping FE-only flags from the hardcoded table
	return {
		...base,
		isAdmin: endpoint.esStaff,
		requiresSalon: endpoint.requiereSalon,
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
