// Re-export shared DTOs from profesor models
import type { HorarioProfesorDto } from '../../profesor/models';
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
export type { EstudianteArchivoDto } from '@data/models';

export interface RegistrarEstudianteArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}

// #endregion
// #region Student task file DTOs
export type { EstudianteTareaArchivoDto } from '@data/models';

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
	seccion: string;
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
	asistenciaCursoId: number;
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

// Respuesta discriminada de la resolución de curso activo: con un único horario
// activo `resumen` viene poblado (ahorra un round-trip); con 0 o varios, `horarios`
// viene poblado (mismo shape que mis-horarios) para caer al selector manual.
export interface MiAsistenciaResolucionDto {
	resumen?: MiAsistenciaCursoResumenDto;
	horarios?: HorarioProfesorDto[];
}
// #endregion

// #region Solicitud de justificación (autoservicio estudiante)
export type EstadoSolicitudJustificacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudJustificacionAsistenciaDto {
	id: number;
	asistenciaCursoId: number;
	horarioId: number;
	cursoNombre: string;
	salonDescripcion: string;
	fecha: string;
	estudianteId: number;
	estudianteNombre: string;
	estado: EstadoSolicitudJustificacion;
	comentario: string | null;
	documentoUrl: string | null;
	documentoNombre: string | null;
	motivoRechazo: string | null;
	resueltoPorRol: string | null;
	fechaResolucion: string | null;
	fechaSolicitud: string;
}

export interface JustificarInasistenciaContext {
	asistenciaCursoId: number;
	fecha: string;
	motivoRechazoAnterior: string | null;
}
// #endregion
