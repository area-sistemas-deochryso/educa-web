// #region DTOs de Response (Backend ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Frontend)

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
  label: string; // "MatemÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡tica"
  grados: string[]; // ["1ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°", "2ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°", "3ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°"]
  niveles: string[]; // ["Inicial", "Primaria", "Secundaria"]
}

// #endregion
// #region AgrupaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n por nivel educativo

export interface CursosPorNivel {
  inicial: CursoOption[];
  primaria: CursoOption[];
  secundaria: CursoOption[];
}
// #endregion
