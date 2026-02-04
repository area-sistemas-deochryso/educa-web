import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';

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

		// Crear FormData
		const formData = new FormData();
		formData.append('file', file, file.name);
		formData.append('containerName', containerName);
		formData.append('appendTimestamp', appendTimestamp.toString());

		return this.http.post<BlobUploadResponse>(`${this.apiUrl}/upload`, formData);
	}

	/**
	 * Formatea el tamaño del archivo en formato legible
	 * @param bytes - Tamaño en bytes
	 * @returns Tamaño formateado (ej: "2.4 MB")
	 */
	formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	/**
	 * Obtiene el tipo de archivo basándose en la extensión
	 * @param fileName - Nombre del archivo
	 * @returns Tipo de archivo ('pdf', 'doc', 'image', 'video', 'link')
	 */
	getFileType(fileName: string): 'pdf' | 'doc' | 'image' | 'video' | 'link' {
		const extension = fileName.split('.').pop()?.toLowerCase();

		const typeMap: Record<string, 'pdf' | 'doc' | 'image' | 'video' | 'link'> = {
			pdf: 'pdf',
			doc: 'doc',
			docx: 'doc',
			jpg: 'image',
			jpeg: 'image',
			png: 'image',
			gif: 'image',
			mp4: 'video',
			avi: 'video',
			mov: 'video',
		};

		return typeMap[extension || ''] || 'link';
	}
}
