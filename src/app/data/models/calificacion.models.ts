// #region Types
export const TIPOS_EVALUACION = [
  'Tarea',
  'Examen',
  'Exposicion',
  'Participacion',
  'Otro',
] as const;

export type TipoEvaluacion = (typeof TIPOS_EVALUACION)[number];
// #endregion

// #region Response DTOs compartidos
// Estos DTOs son usados por múltiples features (profesor, salones)
// y por eso viven en la capa de datos compartida.

export interface CalificacionDto {
  id: number;
  cursoContenidoId: number;
  tareaId: number | null;
  semanaId: number;
  numeroSemana: number;
  titulo: string;
  peso: number;
  fechaEvaluacion: string;
  tipo: TipoEvaluacion;
  esGrupal: boolean;
  estado: boolean;
}

export interface PeriodoCalificacionDto {
  id: number;
  nombre: string;
  orden: number;
  semanaInicio: number;
  semanaFin: number;
}

export interface PromedioDto {
  periodo: string;
  promedio: number | null;
}

export interface NotaResumenDto {
  calificacionId: number;
  nota: number | null;
}

export interface EstudianteNotasResumenDto {
  estudianteId: number;
  dni: string;
  nombreCompleto: string;
  notas: NotaResumenDto[];
  promedios: PromedioDto[];
}

export interface SalonNotasResumenDto {
  salonId: number;
  cursoNombre: string;
  evaluaciones: CalificacionDto[];
  periodos: PeriodoCalificacionDto[];
  estudiantes: EstudianteNotasResumenDto[];
}
// #endregion
