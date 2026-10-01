// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import { logger, FileUploadBuilder, withRetry, classifyFile, formatFileSize } from '@core/helpers';

// #endregion
// #region Implementation
export interface BlobUploadResponse {
	message: string;
	url: string;
	fileName: string;
	containerName: string;
}

@Injectable({ providedIn: 'root' })
export class BlobStorageService {
	// * Upload helper for Azure Blob Storage and file metadata utilities.
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/BlobStorage`;

	/**
	 * Sube un archivo al Azure Blob Storage
	 * @param file - Archivo a subir
	 * @param containerName - Nombre del container (ej: 'course-attachments', 'student-submissions')
	 * @param appendTimestamp - Si es true, agrega timestamp al nombre del archivo
	 * @returns Observable con la respuesta de la subida
	 */
	uploadFile(
		file: File,
		containerName: string,
		appendTimestamp = false,
	): Observable<BlobUploadResponse> {
		// Validación
		if (!file) {
			logger.error('[BlobStorageService] File is null or undefined');
			throw new Error('File is required');
		}

		if (!containerName) {
			logger.error('[BlobStorageService] Container name is empty');
			throw new Error('Container name is required');
		}

		const formData = FileUploadBuilder.create(file)
			.container(containerName)
			.withTimestamp(appendTimestamp)
			.build();

		return this.http
			.post<BlobUploadResponse>(`${this.apiUrl}/upload`, formData)
			.pipe(withRetry({ tag: 'BlobStorageService:uploadFile' }));
	}

	/**
	 * Formatea el tamaño del archivo en formato legible
	 * @param bytes - Tamaño en bytes
	 * @returns Tamaño formateado (ej: "2.4 MB")
	 */
	formatFileSize(bytes: number): string {
		return formatFileSize(bytes);
	}

	/**
	 * Obtiene el tipo de archivo basándose en la extensión
	 * @param fileName - Nombre del archivo
	 * @returns Tipo de archivo ('pdf', 'doc', 'image', 'video', 'link')
	 */
	getFileType(fileName: string): 'pdf' | 'doc' | 'image' | 'video' | 'link' {
		const kind = classifyFile({ fileName });
		if (kind === 'pdf' || kind === 'image' || kind === 'video') return kind;
		if (kind === 'word' || kind === 'excel' || kind === 'ppt') return 'doc';
		return 'link';
	}
}
// #endregion
