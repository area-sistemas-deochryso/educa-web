/**
 * Límites de subida alineados con `Educa.API/Constants/Sistema/FileUploadConfig.cs`
 * (MaxFileSize, AllowedExtensions, MaxFileNameLength). Si el BE cambia, actualizar acá.
 */
export const UPLOAD_LIMITS = {
	maxFileSizeBytes: 100 * 1024 * 1024,
	maxFileNameLength: 200,
	allowedExtensions: [
		'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
		'.txt', '.csv', '.odt', '.ods', '.odp', '.epub',
		'.zip', '.rar', '.7z', '.tar', '.gz', '.zipx',
		'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
		'.mp3', '.mp4', '.webm',
	],
} as const;

/** Valor listo para el atributo `accept` del input de archivos. */
export const UPLOAD_ACCEPT = UPLOAD_LIMITS.allowedExtensions.join(',');

/** Forma común de los límites de subida; `UPLOAD_LIMITS` y los de cada flujo con tope propio la cumplen. */
export interface UploadLimits {
	readonly maxFileSizeBytes: number;
	readonly maxFileNameLength: number;
	readonly allowedExtensions: readonly string[];
}

/**
 * Justificaciones de asistencia/salud: el BE (`JustificacionAsistenciaService`, `JustificacionSaludService`)
 * solo acepta PDF/imagen hasta 10 MB — más estricto que el resto de subidas.
 */
export const JUSTIFICATION_UPLOAD_LIMITS: UploadLimits = {
	maxFileSizeBytes: 10 * 1024 * 1024,
	maxFileNameLength: UPLOAD_LIMITS.maxFileNameLength,
	allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
};

export const JUSTIFICATION_UPLOAD_ACCEPT = JUSTIFICATION_UPLOAD_LIMITS.allowedExtensions.join(',');

/** Devuelve el mensaje de error en español si el archivo no cumple los límites (por defecto los del BE general), o `null` si es válido. */
export function validateUploadFile(file: Pick<File, 'name' | 'size'>, limits: UploadLimits = UPLOAD_LIMITS): string | null {
	if (file.name.length > limits.maxFileNameLength) {
		return `El nombre del archivo supera los ${limits.maxFileNameLength} caracteres.`;
	}
	const dot = file.name.lastIndexOf('.');
	const extension = dot < 0 ? '' : file.name.slice(dot).toLowerCase();
	if (!limits.allowedExtensions.includes(extension)) {
		return 'Tipo de archivo no permitido.';
	}
	if (file.size > limits.maxFileSizeBytes) {
		return `El archivo supera el tamaño máximo de ${Math.round(limits.maxFileSizeBytes / (1024 * 1024))} MB.`;
	}
	return null;
}
