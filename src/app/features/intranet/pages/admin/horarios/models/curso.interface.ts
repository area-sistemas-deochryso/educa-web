// #region DTOs de Response (Backend → Frontend)

export interface CursoListaDto {
  id: number;
  nombre: string;
  estado: boolean;
  usuarioReg: string | null;
  fechaReg: string | null;
  usuarioMod: string | null;
  fechaMod: string | null;
  grados: GradoSimpleDto[];
}

export interface GradoSimpleDto {
  id: number;
  nombre: string;
}

// #endregion
// #region Opciones para dropdowns

export interface CursoOption {
  value: number; // cursoId
  label: string; // "Matemática"
  grados: string[]; // ["1°", "2°", "3°"]
  niveles: string[]; // ["Inicial", "Primaria", "Secundaria"]
}

// #endregion
// #region Agrupación por nivel educativo

export interface CursosPorNivel {
  inicial: CursoOption[];
  primaria: CursoOption[];
  secundaria: CursoOption[];
}
// #endregion
