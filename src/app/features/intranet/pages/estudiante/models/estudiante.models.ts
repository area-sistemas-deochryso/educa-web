// Re-export shared DTOs from profesor models
export type {
	HorarioProfesorDto,
	CursoContenidoDetalleDto,
	CursoContenidoSemanaDto,
	CursoContenidoArchivoDto,
	CursoContenidoTareaDto,
	TareaArchivoDto,
	CalificacionDto,
	CalificacionNotaDto,
	CalificacionConNotasDto,
	CalificacionConMiNotaDto,
	PeriodoCalificacionDto,
	EstudianteMisNotasDto,
	EstudiantePromediosDto,
	PromedioSemanaDto,
	PromedioPeriodoDto,
	GruposResumenDto,
	GrupoContenidoDto,
	GrupoEstudianteDto,
	EstudianteSinGrupoDto,
} from '../../profesor/models';
export {
	calcularPromedioPonderado,
	esNotaEditable,
	NOTA_MINIMA,
	NOTA_MAXIMA,
	TIPOS_EVALUACION,
	MESES_LIMITE_EDICION,
} from '../../profesor/models';
export type { TipoEvaluacion, VistaPromedio } from '../../profesor/models';

// #region Student file DTOs
export interface EstudianteArchivoDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
	fechaReg: string;
}

export interface RegistrarEstudianteArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}

// #endregion
// #region Student task file DTOs
export interface EstudianteTareaArchivoDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
	fechaReg: string;
}

export interface RegistrarEstudianteTareaArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}
// #endregion

// #region Salon DTOs (derived from horarios on frontend)
export interface EstudianteSalon {
	salonId: number;
	salonDescripcion: string;
	cantidadEstudiantes: number;
	cursos: EstudianteSalonCurso[];
}

export interface EstudianteSalonCurso {
	cursoId: number;
	cursoNombre: string;
	horarioId: number;
}
// #endregion

// #region Attendance DTOs (student view — own records only)
// Import for local use + re-export from canonical source (profesor models)
import type { EstadoAsistenciaCurso } from '../../profesor/models';
export type { EstadoAsistenciaCurso };
export {
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
	ESTADO_ASISTENCIA_ICONS,
} from '../../profesor/models';

export interface MiAsistenciaCursoItemDto {
	fecha: string;
	estado: EstadoAsistenciaCurso;
	justificacion: string | null;
}

export interface MiAsistenciaCursoResumenDto {
	horarioId: number;
	cursoNombre: string;
	salonDescripcion: string;
	totalPresente: number;
	totalTarde: number;
	totalFalto: number;
	totalClases: number;
	detalle: MiAsistenciaCursoItemDto[];
}
// #endregion
