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
	/**
	 * Si el facade debe refetchear el listado cuando otro tab (leader) commitea
	 * una entry WAL del mismo `resourceType`. Default `true`.
	 *
	 * Setear `false` para listas con paginación server-side pesada donde el
	 * refetch automático es costo neto y la UX cross-tab no lo justifica.
	 *
	 * Ver `rules/optimistic-ui.md` § "Refetch cross-tab tras commit del leader".
	 */
	crossTabRefetch?: boolean;
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
