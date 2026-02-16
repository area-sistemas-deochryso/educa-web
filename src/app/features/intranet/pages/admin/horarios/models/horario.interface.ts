// #region DTOs de Response (Backend → Frontend)

export interface HorarioResponseDto {
  id: number;
  diaSemana: number;
  diaSemanaDescripcion: string;
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  estado: boolean;
  salonId: number;
  salonDescripcion: string;
  cursoId: number;
  cursoNombre: string;
  profesorId: number | null;
  profesorNombreCompleto: string | null;
  cantidadEstudiantes: number;
  estudiantes: null;
}

export interface HorarioDetalleResponseDto {
  id: number;
  diaSemana: number;
  diaSemanaDescripcion: string;
  horaInicio: string;
  horaFin: string;
  estado: boolean;
  salonId: number;
  salonDescripcion: string;
  gradoNombre: string;
  seccionNombre: string;
  sedeNombre: string;
  anio: number;
  cursoId: number;
  cursoNombre: string;
  profesorId: number | null;
  profesorNombreCompleto: string | null;
  profesorDni: string | null;
  cantidadEstudiantes: number;
  estudiantes: EstudianteHorarioDto[];
  usuarioReg: string;
  fechaReg: string;
  usuarioMod: string | null;
  fechaMod: string | null;
}

export interface EstudianteHorarioDto {
  id: number;
  dni: string;
  nombreCompleto: string;
}

// #endregion
// #region DTOs de Request (Frontend → Backend)

export interface HorarioCreateDto {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  salonId: number;
  cursoId: number;
  usuarioReg: string;
}

export interface HorarioUpdateDto {
  id: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  salonId: number;
  cursoId: number;
  usuarioMod: string;
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
// #region Modelos Locales (Frontend)

export interface HorarioFormData {
  // Paso 1: Datos básicos
  diaSemana: number | null;
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
  promedioEstudiantesPorHorario?: number;
}

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
  dias: {
    [key: number]: HorarioWeeklyBlock[];
  };
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

// Colores para diferenciar cursos en vista semanal
export const CURSO_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];
// #endregion
