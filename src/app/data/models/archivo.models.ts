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
	/** `false` = borrador: solo lo ve el estudiante autor. Publicado, lo ve el profesor y, si la actividad es grupal, su grupo. */
	publicado: boolean;
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
	/** `false` = borrador: solo lo ve el estudiante autor. Publicado, lo ve el profesor y, si la actividad es grupal, su grupo. */
	publicado: boolean;
}
