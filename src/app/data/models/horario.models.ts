// #region Response DTOs compartidos (Backend → Frontend)
// Estos DTOs son usados por múltiples features (horarios, salones, profesor)
// y por eso viven en la capa de datos compartida.

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
  rowVersion?: string;
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
  tutorNombre: string | null;
  usuarioReg: string;
  fechaReg: string;
  usuarioMod: string | null;
  fechaMod: string | null;
  rowVersion?: string;
}

export interface EstudianteHorarioDto {
  id: number;
  dni: string;
  nombreCompleto: string;
}
// #endregion
