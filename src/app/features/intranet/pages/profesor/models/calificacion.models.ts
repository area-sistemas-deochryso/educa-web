// #region Shared types (importados + re-exportados desde @data/models)
import type {
  CalificacionDto,
  ConfiguracionCalificacionListDto,
  EstudianteNotasResumenDto,
  NotaResumenDto,
  PeriodoCalificacionDto,
  PromedioDto,
  SalonNotasResumenDto,
  TipoEvaluacion,
} from '@data/models';

export type {
  CalificacionDto,
  EstudianteNotasResumenDto,
  NotaResumenDto,
  PeriodoCalificacionDto,
  PromedioDto,
  SalonNotasResumenDto,
  TipoEvaluacion,
};
export { TIPOS_EVALUACION, TIPO_EVALUACION_LABEL, tipoEvaluacionLabel } from '@data/models';
// #endregion

// #region Constants
export const NOTA_MINIMA = 0;
export const NOTA_MAXIMA = 20;
export const MESES_LIMITE_EDICION = 2;
export const PESO_MINIMO = 0.01;
export const PESO_MAXIMO = 1.0;
// #endregion

// #region Types
export type VistaPromedio = 'semana' | 'periodo' | 'anual';
// #endregion

// #region Response DTOs (feature-specific)

export interface CalificacionNotaDto {
  id: number;
  calificacionId: number;
  estudianteId: number;
  estudianteNombre: string;
  nota: number;
  observacion: string | null;
  fechaCalificacion: string;
  esOverride: boolean;
  grupoId: number | null;
  grupoNombre: string | null;
  esEditable: boolean;
}

export interface CalificacionConNotasDto extends CalificacionDto {
  notas: CalificacionNotaDto[];
}
// #endregion

// #region Request DTOs
export interface CrearCalificacionDto {
  cursoContenidoId: number;
  tareaId: number | null;
  semanaId: number;
  titulo: string;
  peso: number;
  fechaEvaluacion: string;
  tipo: TipoEvaluacion;
  esGrupal: boolean;
}

export interface CalificarEstudianteDto {
  estudianteId: number;
  nota: number;
  observacion: string | null;
}

export interface CalificarLoteDto {
  notas: CalificarEstudianteDto[];
}

export interface ActualizarNotaDto {
  nota: number;
  observacion: string | null;
}

export interface CrearPeriodoDto {
  cursoContenidoId: number;
  nombre: string;
  orden: number;
  semanaInicio: number;
  semanaFin: number;
}

export interface CambiarTipoCalificacionDto {
  esGrupal: boolean;
}

/** Vista previa de solo lectura del cambio de modalidad (INV-C17). Los números los calcula el BE; el FE no los recalcula. */
export interface ImpactoCambioTipoDto {
  esGrupalDestino: boolean;
  notasConservadas: number;
  /** Individual → grupal: notas que quedan como excepción de su grupo. */
  notasQuePasanAExcepcion: number;
  /** Individual → grupal: notas de alumnos que no están en ningún grupo. */
  notasSinGrupo: number;
  /** Grupal → individual: grupos cuya nota y observación dejan de tener fila propia. */
  gruposQueDejanDeExistir: number;
  tieneTareaEnlazada: boolean;
  entregasPublicadasQueCambianDeVisibilidad: number;
}

/** Datos con los que se abre «Nueva evaluación» desde una tarea («Es calificable»). El peso no se prellena (INV-C04). */
export interface EvaluacionPrefill {
  titulo: string;
  semanaId: number;
  fechaEvaluacion: string | null;
  tareaId: number;
  esGrupal: boolean;
}

/** `tareaId: null` desenlaza (INV-C16). */
export interface VincularTareaDto {
  tareaId: number | null;
}
// #endregion

// Salon view DTOs (PromedioDto, NotaResumenDto, EstudianteNotasResumenDto, SalonNotasResumenDto)
// re-exportados desde @data/models en la sección de arriba

// #region Student view DTOs
export interface CalificacionConMiNotaDto extends CalificacionDto {
  nota: number | null;
  observacion: string | null;
  promedioGeneral: number | null;
  /**
   * Sin nota del estudiante y con el plazo vencido (INV-C12 § Vacíos y vencimiento del plazo). `nota` sigue `null`:
   * el 0 es de presentación. Lo decide el BE; ausente en un BE anterior (se trata como no vencida).
   */
  vencida?: boolean;
}

export interface PromedioSemanaDto {
  numeroSemana: number;
  promedio: number | null;
}

export interface PromedioPeriodoDto {
  periodoNombre: string;
  /** Promedio oficial del periodo (INV-C04, Σ nota×peso sin normalizar). No mostrar al estudiante como "promedio". */
  promedio: number | null;
  /** Parcial del periodo (INV-C12 § Parcial por periodo). `null` si cobertura 0. Lo calcula el BE; ausente en un BE anterior. */
  promedioParcial?: number | null;
  /** % del periodo con nota, relativo al periodo (0-100, entero). Lo calcula el BE; ausente en un BE anterior. */
  coberturaEvaluada?: number;
}

export interface EstudiantePromediosDto {
  porSemana: PromedioSemanaDto[];
  porPeriodo: PromedioPeriodoDto[];
  /** Promedio oficial (INV-C04, Σ nota×peso). No usar como "promedio" en la UI del estudiante. */
  general: number | null;
  /** Promedio parcial sobre lo calificado (INV-C12). `null` si cobertura 0. Lo calcula el BE. */
  promedioParcial: number | null;
  /** % del curso con nota (0-100, entero). Lo calcula el BE (INV-C12). */
  coberturaEvaluada: number;
}

export interface EstudianteMisNotasDto {
  cursoId?: number | null;
  cursoContenidoId: number;
  cursoNombre: string;
  salonDescripcion: string;
  evaluaciones: CalificacionConMiNotaDto[];
  periodos: PeriodoCalificacionDto[];
  promedios: EstudiantePromediosDto;
  /** Escala (INV-U06) del nivel/año del salón del curso; `null`/ausente si no hay config → presentación numérica. La resuelve el BE. */
  escalaCalificacion?: ConfiguracionCalificacionListDto | null;
}
// #endregion

// Re-export utils para compatibilidad con imports existentes
export {
  calcularPromedioPonderado,
  recalcularPromedios,
  esNotaEditable,
} from '../utils/calificacion.utils';
