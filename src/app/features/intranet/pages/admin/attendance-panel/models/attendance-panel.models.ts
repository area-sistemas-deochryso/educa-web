import type { RangoTipo, TipoPersonaReporte } from '@features/intranet/pages/cross-role/attendance-reports/models';

// #region Filtros
export interface AttendancePanelFilters {
	sedeId: number | null;
	rango: RangoTipo;
	fecha: Date;
}

export function getDefaultPanelFilters(): AttendancePanelFilters {
	return { sedeId: null, rango: 'dia', fecha: new Date() };
}
// #endregion

// #region KPIs
export interface AttendancePanelKpis {
	porcentajeAsistencia: number;
	ausencias: number;
	tardanzas: number;
	porcentajeAsistenciaPrevio: number;
	ausenciasPrevio: number;
	tardanzasPrevio: number;
	/**
	 * `false` en Semana/Mes: `ReportesAsistencia/tendencia` (fuente de estos KPIs en ese rango,
	 * ver `AttendancePanelService.getKpis`) solo expone porcentajes, no conteos crudos ni el
	 * denominador para derivarlos — `ausencias`/`tardanzas` no son datos reales en ese caso y la
	 * UI debe ocultarlos en vez de mostrar un conteo inventado (Chat 2026-07-21, gap reportado).
	 */
	conteosDisponibles: boolean;
	/**
	 * `false` cuando la llamada a `tendencia` del período anterior falla (bug de BE observado en
	 * Mes: 500 "An item with the same key has already been added" para ciertos rangos, Chat
	 * 2026-07-21) — la comparación no es un dato real en ese caso y no debe mostrarse como
	 * "sin cambios" (sería una afirmación falsa sobre el período anterior).
	 */
	comparacionDisponible: boolean;
}

export function emptyPanelKpis(): AttendancePanelKpis {
	return {
		porcentajeAsistencia: 0,
		ausencias: 0,
		tardanzas: 0,
		porcentajeAsistenciaPrevio: 0,
		ausenciasPrevio: 0,
		tardanzasPrevio: 0,
		comparacionDisponible: true,
		conteosDisponibles: true,
	};
}
// #endregion

// #region Breakdown por tipo de persona
export interface AttendancePanelBreakdownItem {
	tipoPersona: TipoPersonaReporte;
	label: string;
	porcentajeAsistencia: number;
}
// #endregion

// #region Chart — Día (barras horarias on-time vs tarde)
export interface AttendancePanelHoraBucket {
	hora: number;
	aTiempo: number;
	tarde: number;
}
// #endregion

// #region Chart — Semana/Mes (línea por tipo de persona)
export interface AttendancePanelSeriePunto {
	etiqueta: string;
	porcentaje: number;
}

export interface AttendancePanelSerie {
	tipoPersona: TipoPersonaReporte;
	label: string;
	puntos: AttendancePanelSeriePunto[];
}
// #endregion

// #region DTO agregado del panel
export interface AttendancePanelDto {
	kpis: AttendancePanelKpis;
	breakdown: AttendancePanelBreakdownItem[];
	horaBuckets: AttendancePanelHoraBucket[];
	series: AttendancePanelSerie[];
}

export function emptyPanelDto(): AttendancePanelDto {
	return { kpis: emptyPanelKpis(), breakdown: [], horaBuckets: [], series: [] };
}
// #endregion

// #region Constantes de dominio
/** Personas consideradas en el breakdown/series (excluye 'todos', que es solo un filtro agregado). */
export const PANEL_TIPOS_PERSONA: readonly TipoPersonaReporte[] = ['E', 'P', 'A', 'C', 'M'];

export const PANEL_TIPO_PERSONA_LABELS: Record<TipoPersonaReporte, string> = {
	E: 'Estudiantes',
	P: 'Profesores',
	A: 'Asist. Admin.',
	C: 'Coordinadores',
	M: 'Promotores',
	todos: 'Todos',
};
// #endregion
