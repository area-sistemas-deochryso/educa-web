// #region DTOs de Response (Backend → Frontend)

export interface SalonListDto {
  salonId: number;
  gradoId: number;
  grado: string;
  seccionId: number;
  seccion: string;
  sedeId: number;
  sede: string;
  nombreSalon: string; // ej: "3° A - Sede Principal"
  anio: number;
  estado: boolean;
  totalProfesores: number;
  totalEstudiantes: number;
  tutorNombre: string | null;
}

// #endregion
// #region Opciones para dropdowns

export interface SalonOption {
  value: number; // salonId
  label: string; // "3° A - Sede Principal"
  grado: string;
  seccion: string;
  sede: string;
  totalEstudiantes: number;
}
// #endregion
