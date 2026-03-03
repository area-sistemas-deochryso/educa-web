// Re-export shared DTOs from profesor models
export type {
	HorarioProfesorDto,
	CursoContenidoDetalleDto,
	CursoContenidoSemanaDto,
	CursoContenidoArchivoDto,
	CursoContenidoTareaDto,
	TareaArchivoDto,
} from '../../profesor/models';

// #region Student file DTOs
export interface EstudianteArchivoDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
	fechaReg: string;
}

export interface RegistrarEstudianteArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}

// #endregion
// #region Student task file DTOs
export interface EstudianteTareaArchivoDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
	fechaReg: string;
}

export interface RegistrarEstudianteTareaArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}
// #endregion
