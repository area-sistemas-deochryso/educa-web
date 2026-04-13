export interface HasEstado {
	estado: boolean | number | null;
}

/** Configuración que cada facade concreto provee al construir. */
export interface BaseCrudFacadeConfig {
	/** Tag para logs y errores (ej: 'CursosFacade') */
	tag: string;
	/** Tipo de recurso para WAL (ej: 'Curso') */
	resourceType: string;
	/** URL base de la API (ej: `${environment.apiUrl}/api/sistema/cursos`) */
	apiUrl: string;
	/** Mensaje para error de carga inicial */
	loadErrorMessage: string;
}

/** Resultado paginado de la API */
export interface PaginatedResult<T> {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
}

/** Claves de estadísticas para toggle/delete */
export interface EstadisticaKeys {
	total: string;
	activos: string;
	inactivos: string;
}
