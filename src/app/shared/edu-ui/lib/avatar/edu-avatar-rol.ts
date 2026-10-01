export type EduAvatarRolSeverity = 'success' | 'warn' | 'danger' | 'info' | 'contrast';

export interface EduAvatarRolAccent {
	severity: EduAvatarRolSeverity;
	icon: string;
}

const STAFF_ACCENT: EduAvatarRolAccent = { severity: 'contrast', icon: 'pi pi-briefcase' };
const DIRECTION_ACCENT: EduAvatarRolAccent = { severity: 'danger', icon: 'pi pi-shield' };

/** Mismas severidades que `UiMappingService.getRolSeverity`; Director y Administrador comparten acento. */
const ACCENT_BY_ROL: Record<string, EduAvatarRolAccent> = {
	Director: DIRECTION_ACCENT,
	Administrador: DIRECTION_ACCENT,
	Profesor: { severity: 'warn', icon: 'pi pi-book' },
	Apoderado: { severity: 'info', icon: 'pi pi-users' },
	Estudiante: { severity: 'success', icon: 'pi pi-graduation-cap' },
	'Asistente Administrativo': STAFF_ACCENT,
	Promotor: STAFF_ACCENT,
	'Coordinador Académico': STAFF_ACCENT,
};

/** Rol desconocido o vacío → `null` (avatar sin acento, neutro). */
export function getAvatarRolAccent(rol: string | null | undefined): EduAvatarRolAccent | null {
	return (rol && ACCENT_BY_ROL[rol]) || null;
}
