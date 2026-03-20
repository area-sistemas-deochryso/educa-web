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
