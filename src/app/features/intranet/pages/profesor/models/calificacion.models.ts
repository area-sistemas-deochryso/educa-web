// #region Constants
export const NOTA_MINIMA = 0;
export const NOTA_MAXIMA = 20;
export const MESES_LIMITE_EDICION = 2;
export const PESO_MINIMO = 0.01;
export const PESO_MAXIMO = 1.0;

export const TIPOS_EVALUACION = [
  'Tarea',
  'Examen',
  'Exposicion',
  'Participacion',
  'Otro',
] as const;
// #endregion

// #region Types
export type TipoEvaluacion = (typeof TIPOS_EVALUACION)[number];
export type VistaPromedio = 'semana' | 'periodo' | 'anual';
// #endregion

// #region Response DTOs
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

export interface PeriodoCalificacionDto {
  id: number;
  nombre: string;
  orden: number;
  semanaInicio: number;
  semanaFin: number;
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

// #region Salon view DTOs
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
  cursoNombre: string;
  salonDescripcion: string;
  evaluaciones: CalificacionConMiNotaDto[];
  periodos: PeriodoCalificacionDto[];
  promedios: EstudiantePromediosDto;
}
// #endregion

// #region Helpers
/**
 * Promedio ponderado: sum(nota * peso).
 * Los pesos son fracciones absolutas (ej: 0.2 = 20%) que suman ~1.0
 * cuando todas las evaluaciones están presentes, por lo que NO se
 * normaliza dividiendo por la suma de pesos.
 */
export function calcularPromedioPonderado(
  notas: { nota: number; peso: number }[],
): number | null {
  if (notas.length === 0) return null;
  const suma = notas.reduce((acc, n) => acc + n.nota * n.peso, 0);
  return Math.round(suma * 10) / 10;
}

/**
 * Recalculate period promedios for a student locally after editing a nota.
 * Mirrors backend CalcularPromedios logic: sum(nota * peso) per period.
 */
export function recalcularPromedios(
  notas: NotaResumenDto[],
  evaluaciones: CalificacionDto[],
  periodos: PeriodoCalificacionDto[],
): PromedioDto[] {
  const notasMap = new Map<number, number | null>();
  for (const n of notas) {
    notasMap.set(n.calificacionId, n.nota);
  }

  const result: PromedioDto[] = [];

  for (const periodo of periodos) {
    const entries: { nota: number; peso: number }[] = [];
    for (const ev of evaluaciones) {
      if (ev.numeroSemana >= periodo.semanaInicio && ev.numeroSemana <= periodo.semanaFin) {
        const nota = notasMap.get(ev.id);
        if (nota !== null && nota !== undefined) {
          entries.push({ nota, peso: ev.peso });
        }
      }
    }
    result.push({ periodo: periodo.nombre, promedio: calcularPromedioPonderado(entries) });
  }

  // General = all evaluaciones
  const allEntries: { nota: number; peso: number }[] = [];
  for (const ev of evaluaciones) {
    const nota = notasMap.get(ev.id);
    if (nota !== null && nota !== undefined) {
      allEntries.push({ nota, peso: ev.peso });
    }
  }
  result.push({ periodo: 'General', promedio: calcularPromedioPonderado(allEntries) });

  return result;
}

export function esNotaEditable(fechaCalificacion: string): boolean {
  const fecha = new Date(fechaCalificacion);
  const limite = new Date(fecha);
  limite.setMonth(limite.getMonth() + MESES_LIMITE_EDICION);
  return new Date() < limite;
}
// #endregion
