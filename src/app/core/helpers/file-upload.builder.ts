// #region Tipos
export interface FileUploadConfig {
	containerName: string;
	appendTimestamp?: boolean;
}
// #endregion

// #region Builder
/**
 * Builder para construir FormData de uploads a Azure Blob Storage.
 *
 * Centraliza la construcción repetida en BlobStorageService,
 * ProfesorApiService y EstudianteApiService.
 *
 * @example
 * const formData = FileUploadBuilder.create(file)
 *   .container('curso-contenido')
 *   .withTimestamp()
 *   .build();
 *
 * return this.http.post(url, formData);
 */
export class FileUploadBuilder {
	private readonly formData = new FormData();

	private constructor(file: File) {
		this.formData.append('file', file, file.name);
	}

	/** Punto de entrada del builder */
	static create(file: File): FileUploadBuilder {
		return new FileUploadBuilder(file);
	}

	/** Nombre del container en Azure Blob Storage */
	container(name: string): this {
		this.formData.append('containerName', name);
		return this;
	}

	/** Agrega timestamp al nombre del archivo para evitar colisiones */
	withTimestamp(enabled = true): this {
		this.formData.append('appendTimestamp', enabled.toString());
		return this;
	}

	/** Construye desde un config predefinido (útil para configs reutilizables) */
	fromConfig(config: FileUploadConfig): this {
		this.container(config.containerName);
		if (config.appendTimestamp !== false) {
			this.withTimestamp(config.appendTimestamp ?? false);
		}
		return this;
	}

	/** Retorna el FormData construido */
	build(): FormData {
		return this.formData;
	}
}
// #endregion
