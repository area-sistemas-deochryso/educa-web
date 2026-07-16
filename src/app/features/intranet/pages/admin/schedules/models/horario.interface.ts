// #region DTOs de Response (re-exportados desde @data/models)
import type { HorarioResponseDto as _HorarioResponseDto, DiaSemana as _DiaSemana } from '@data/models';

export type {
  DiaSemana,
  EstudianteHorarioDto,
  HorarioDetalleResponseDto,
  HorarioResponseDto,
} from '@data/models';

type DiaSemana = _DiaSemana;

type HorarioResponseDto = _HorarioResponseDto;

// #endregion
// #region DTOs de Request (Frontend → Backend)

export interface HorarioCreateDto {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  salonId: number;
  cursoId: number;
  usuarioReg: string;
}

export interface HorarioUpdateDto {
  id: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  salonId: number;
  cursoId: number;
  usuarioMod: string;
  rowVersion?: string;
}

export interface HorarioAsignarProfesorDto {
  horarioId: number;
  profesorId: number;
  usuarioMod: string;
}

export interface HorarioAsignarEstudiantesDto {
  horarioId: number;
  estudianteIds: number[] | null; // null = todos del salón
  usuarioReg: string;
}

// #endregion
// #region Tipos semánticos

export const HORARIO_VISTAS = ['salon', 'profesor', 'global'] as const;
export type HorarioVistaType = (typeof HORARIO_VISTAS)[number];

// #endregion
// #region Modelos Locales (Frontend)

export interface HorarioFormData {
  // Paso 1: Datos básicos
  diaSemana: DiaSemana | null;
  horaInicio: string;
  horaFin: string;
  salonId: number | null;
  cursoId: number | null;

  // Paso 2: Profesor (opcional)
  profesorId: number | null;

  // Paso 3: Estudiantes (opcional)
  estudianteIds: number[] | null;
}

export interface HorarioWizardStep {
  id: number;
  label: string;
  icon: string;
  completed: boolean;
}

export interface HorariosEstadisticas {
  totalHorarios: number;
  horariosActivos: number;
  horariosInactivos: number;
  horariosConProfesor: number;
  horariosSinProfesor: number;
  horariosSinEstudiantes: number;
  promedioEstudiantesPorHorario?: number;
}

export type HorarioCompletitudFiltro = 'sinProfesor' | 'sinEstudiantes';

// #endregion
// #region Opciones para Filtros y Selectores

export interface DiaSemanaOption {
  label: string;
  value: number;
}

export interface HorarioWeeklyBlock {
  horario: HorarioResponseDto;
  dia: number;
  color: string; // Color asignado por curso
  duracionMinutos: number;
  posicionVertical: number; // Para posicionar en grid
}

export interface HorarioWeeklyData {
  dias: Record<number, HorarioWeeklyBlock[]>;
}

export interface ScheduleEntityItem {
  id: number;
  label: string;
  subtitle?: string;
  totalSchedules: number;
  withProfesor: number;
  hasConflicts: boolean;
}

export interface EmptySlotClickEvent {
  dia: DiaSemana;
  hora: string;
  salonId?: number;
}

// #endregion
// #region Constantes

export const DIAS_SEMANA: DiaSemanaOption[] = [
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
];

export const HORAS_DIA = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];
// #endregion
