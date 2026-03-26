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

// Re-export utils para compatibilidad con imports existentes
export {
	getRolPolicy,
	isAdminRole,
	canModerateVideoconference,
	canEditPassword,
	rolRequiereSalonPolicy,
	rolPermiteEsTutorPolicy,
	getHorarioEndpoint,
} from '@shared/utils/role-policies.utils';
