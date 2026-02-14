// #region Implementation
// * Curso DTOs and request shapes.
export interface Grado {
	id: number;
	nombre: string;
}

export interface Curso {
	id: number;
	nombre: string;
	estado: boolean;
	usuarioReg?: string;
	fechaReg?: Date;
	usuarioMod?: string;
	fechaMod?: Date;
	grados: Grado[];
}

export interface CrearCursoRequest {
	nombre: string;
	gradosIds: number[];
}

export interface ActualizarCursoRequest {
	nombre: string;
	estado: boolean;
	gradosIds: number[];
}

export interface ApiResponse {
	mensaje: string;
}
// #endregion
