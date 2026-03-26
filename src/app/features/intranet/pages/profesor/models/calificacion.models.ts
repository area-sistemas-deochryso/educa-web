// #region Shared types (importados + re-exportados desde @data/models)
import type {
  CalificacionDto,
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
export { TIPOS_EVALUACION } from '@data/models';
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
// #endregion

// Salon view DTOs (PromedioDto, NotaResumenDto, EstudianteNotasResumenDto, SalonNotasResumenDto)
// re-exportados desde @data/models en la sección de arriba

// #region Student view DTOs
export interface CalificacionConMiNotaDto extends CalificacionDto {
  nota: number | null;
  observacion: string | null;
  promedioGeneral: number | null;
}

export interface PromedioSemanaDto {
  numeroSemana: number;
  promedio: number | null;
}

export interface PromedioPeriodoDto {
  periodoNombre: string;
  promedio: number | null;
}

export interface EstudiantePromediosDto {
  porSemana: PromedioSemanaDto[];
  porPeriodo: PromedioPeriodoDto[];
  general: number | null;
}

export interface EstudianteMisNotasDto {
  cursoContenidoId: number;
  cursoNombre: string;
  salonDescripcion: string;
  evaluaciones: CalificacionConMiNotaDto[];
  periodos: PeriodoCalificacionDto[];
  promedios: EstudiantePromediosDto;
}
// #endregion

// Re-export utils para compatibilidad con imports existentes
export {
  calcularPromedioPonderado,
  recalcularPromedios,
  esNotaEditable,
} from '../utils/calificacion.utils';
