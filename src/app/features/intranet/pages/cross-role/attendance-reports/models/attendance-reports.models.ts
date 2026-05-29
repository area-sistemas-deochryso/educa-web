import type { SalonProfesor } from '@data/models';

// #region Tipos semánticos
export const ESTADO_FILTROS = ['todos', 'faltando', 'viniendo', 'tarde', 'temprano'] as const;
export type EstadoFiltro = (typeof ESTADO_FILTROS)[number];

export const RANGO_TIPOS = ['dia', 'semana', 'mes'] as const;
export type RangoTipo = (typeof RANGO_TIPOS)[number];

export const TIPOS_PERSONA = ['E', 'P', 'A', 'todos'] as const;
export type TipoPersonaReporte = (typeof TIPOS_PERSONA)[number];
// #endregion

// #region DTOs de respuesta API
export interface EstadisticasAsistenciaDia {
	total: number;
	tardanza: number;
	asistio: number;
	falta: number;
	justificado: number;
	pendiente: number;
}

export interface ReporteFiltrado {
	nombreSede: string;
	filtroEstado: EstadoFiltro;
	filtroEstadoDescripcion: string;
	rangoTipo: RangoTipo;
	fechaInicio: string;
	fechaFin: string;
	totalSalones: number;
	totalEstudiantesGeneral: number;
	totalFiltrados: number;
	salones: SalonReporteFiltrado[];
	estadisticas: EstadisticasAsistenciaDia;
	tipoPersona: TipoPersonaReporte;
	profesores?: PersonaProfesorReporte[] | null;
	totalProfesoresGeneral?: number;
	totalProfesoresFiltrados?: number;
	asistentesAdmin?: PersonaAsistenteAdminReporte[] | null;
	totalAsistentesAdminGeneral?: number;
	totalAsistentesAdminFiltrados?: number;
	diasFeriados?: number[] | null;
	diasEnMes?: number | null;
	nombreMes?: string | null;
}

export interface SalonReporteFiltrado {
	grado: string;
	seccion: string;
	totalEstudiantes: number;
	totalFiltrados: number;
	estudiantes: EstudianteReporteFiltrado[];
	estadisticas: EstadisticasAsistenciaDia;
	porcentajeAsistencia: number;
	diasEnMes?: number | null;
	nombreMes?: string | null;
}

export interface AsistenciaDiaMatriz {
	dia: number;
	estadoCodigo: string;
	esFeriado: boolean;
}

export interface EstudianteReporteFiltrado {
	dni: string;
	nombreCompleto: string;
	cantidadDias: number;
	horaLlegada: string | null;
	horaSalida: string | null;
	observacion: string | null;
	estadoCodigo: string;
	estadoDescripcion: string;
	asistenciasDiarias?: AsistenciaDiaMatriz[] | null;
	totalAsistencias?: number | null;
	totalFaltas?: number | null;
	totalTardanzas?: number | null;
	totalJustificados?: number | null;
}

export interface PersonaProfesorReporte {
	dni: string;
	nombreCompleto: string;
	cantidadDias: number;
	horaLlegada: string | null;
	horaSalida: string | null;
	observacion: string | null;
	estadoCodigo: string;
	estadoDescripcion: string;
	asistenciasDiarias?: AsistenciaDiaMatriz[] | null;
	totalAsistencias?: number | null;
	totalFaltas?: number | null;
	totalTardanzas?: number | null;
	totalJustificados?: number | null;
	minutosTardanzaTotal?: number | null;
}

export interface PersonaAsistenteAdminReporte {
	dni: string;
	nombreCompleto: string;
	cantidadDias: number;
	horaLlegada: string | null;
	horaSalida: string | null;
	observacion: string | null;
	estadoCodigo: string;
	estadoDescripcion: string;
	asistenciasDiarias?: AsistenciaDiaMatriz[] | null;
	totalAsistencias?: number | null;
	totalFaltas?: number | null;
	totalTardanzas?: number | null;
	totalJustificados?: number | null;
	minutosTardanzaTotal?: number | null;
}
// #endregion

// #region Estado de filtros
export interface ReporteFilters {
	estado: EstadoFiltro;
	rango: RangoTipo;
	fecha: Date;
	salonesSeleccionados: string[];
	tipoPersona: TipoPersonaReporte;
}

export function getDefaultFilters(): ReporteFilters {
	return {
		estado: 'todos',
		rango: 'dia',
		fecha: new Date(),
		salonesSeleccionados: [],
		tipoPersona: 'E',
	};
}
// #endregion

// #region Opciones de selector
export interface SelectOption<T = string> {
	label: string;
	value: T;
}

export type SalonOption = SelectOption<string>;

export function salonToOption(salon: SalonProfesor): SalonOption {
	return {
		label: `${salon.grado} "${salon.seccion}"`,
		value: `${salon.grado} ${salon.seccion}`,
	};
}
// #endregion
