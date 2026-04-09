// #region Tipos
export interface ModuloDef {
	readonly id: ModuloId;
	readonly label: string;
	readonly icon: string;
	readonly orden: number;
}

export const MODULO_IDS = [
	'inicio',
	'academico',
	'seguimiento',
	'comunicacion',
	'sistema',
] as const;

export type ModuloId = (typeof MODULO_IDS)[number];
// #endregion

// #region Registro de módulos
/**
 * Registro centralizado de módulos de la intranet.
 *
 * Cada módulo responde UNA pregunta:
 * - inicio:       Punto de entrada (siempre visible, sin dropdown)
 * - academico:    "Qué se enseña, dónde y cuándo?" (cursos, salones, horarios)
 * - seguimiento:  "Cómo van los estudiantes?" (asistencia, calificaciones, reportes)
 * - comunicacion: "Qué necesito saber o decir?" (mensajes, eventos, calendario)
 * - sistema:      "Cómo se configura la plataforma?" (usuarios, permisos, vistas)
 */
export const MODULOS: Record<ModuloId, ModuloDef> = {
	inicio: {
		id: 'inicio',
		label: 'Inicio',
		icon: 'pi pi-home',
		orden: 0,
	},
	academico: {
		id: 'academico',
		label: 'Académico',
		icon: 'pi pi-graduation-cap',
		orden: 1,
	},
	seguimiento: {
		id: 'seguimiento',
		label: 'Seguimiento',
		icon: 'pi pi-chart-line',
		orden: 2,
	},
	comunicacion: {
		id: 'comunicacion',
		label: 'Comunicación',
		icon: 'pi pi-comments',
		orden: 3,
	},
	sistema: {
		id: 'sistema',
		label: 'Sistema',
		icon: 'pi pi-cog',
		orden: 4,
	},
} as const;
// #endregion
