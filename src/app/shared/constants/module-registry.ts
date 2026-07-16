// #region Tipos
export interface ModuloDef {
	readonly id: ModuloId;
	readonly label: string;
	readonly icon: string;
	readonly orden: number;
}

export const MODULO_IDS = [
	'inicio',
	'estudiante',
	'profesor',
	'administrador',
	'apoderado',
] as const;

export type ModuloId = (typeof MODULO_IDS)[number];
// #endregion

// #region Registro de módulos
/**
 * Registro centralizado de módulos de la intranet.
 *
 * Cada módulo responde UNA pregunta: "¿quién sos?" (antes: "¿qué necesitás hacer?").
 * - inicio:        Punto de entrada (siempre visible, sin dropdown)
 * - estudiante:    Todo lo que un estudiante necesita de su propia experiencia
 * - profesor:      Todo lo que un profesor necesita para dictar y hacer seguimiento
 * - administrador: Todo lo que gestiona/configura la plataforma (incluye roles administrativos: Director, Asistente, Promotor, Coordinador)
 * - apoderado:      Todo lo que un apoderado consulta sobre sus hijos
 *
 * Items de capability compartida entre roles (sin dueño fijo, ej. Asistencia diaria,
 * Calendario, Videoconferencias) se duplican como MenuItemDef en cada módulo donde
 * aplican — ver `intranet-menu.config.ts`. No hay módulo "Compartido": el filtro real
 * de visibilidad sigue siendo la capability del usuario, duplicar solo amplía en qué
 * módulo puede aparecer el item si el usuario tiene esa capability (brief 444).
 */
export const MODULOS: Record<ModuloId, ModuloDef> = {
	inicio: {
		id: 'inicio',
		label: 'Inicio',
		icon: 'pi pi-home',
		orden: 0,
	},
	estudiante: {
		id: 'estudiante',
		label: 'Estudiante',
		icon: 'pi pi-user',
		orden: 1,
	},
	profesor: {
		id: 'profesor',
		label: 'Profesor',
		icon: 'pi pi-graduation-cap',
		orden: 2,
	},
	administrador: {
		id: 'administrador',
		label: 'Administrador',
		icon: 'pi pi-cog',
		orden: 3,
	},
	apoderado: {
		id: 'apoderado',
		label: 'Apoderado',
		icon: 'pi pi-users',
		orden: 4,
	},
} as const;
// #endregion
