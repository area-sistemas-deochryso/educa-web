// #region Response DTOs (API -> Frontend)

/** Asignación profesor-curso activa (GET /api/profesorcurso/profesor/{id}). */
export interface ProfesorCursoListaDto {
  id: number;
  profesorId: number;
  profesorNombreCompleto: string;
  cursoId: number;
  cursoNombre: string;
  anio: number;
  estado: boolean;
  rowVersion: string | null;
}
// #endregion

// #region Request DTOs (Frontend -> API)

/** Asignación batch de cursos a un profesor (POST /api/profesorcurso/asignar). */
export interface AsignarProfesorCursoRequest {
  profesorId: number;
  cursoIds: number[];
  anio: number;
}
// #endregion
