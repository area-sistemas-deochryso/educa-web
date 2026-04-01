/**
 * Student-uploaded file metadata.
 * Shared between profesor and estudiante features.
 */
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

/**
 * Student-uploaded file metadata for a task.
 * Shared between profesor and estudiante features.
 */
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
