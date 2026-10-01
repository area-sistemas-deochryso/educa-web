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

/** Devuelve el mensaje de error en español si el archivo no cumple los límites del BE, o `null` si es válido. */
export function validateUploadFile(file: Pick<File, 'name' | 'size'>): string | null {
	if (file.name.length > UPLOAD_LIMITS.maxFileNameLength) {
		return `El nombre del archivo supera los ${UPLOAD_LIMITS.maxFileNameLength} caracteres.`;
	}
	const dot = file.name.lastIndexOf('.');
	const extension = dot < 0 ? '' : file.name.slice(dot).toLowerCase();
	if (!(UPLOAD_LIMITS.allowedExtensions as readonly string[]).includes(extension)) {
		return 'Tipo de archivo no permitido.';
	}
	if (file.size > UPLOAD_LIMITS.maxFileSizeBytes) {
		return 'El archivo supera el tamaño máximo de 100 MB.';
	}
	return null;
}
