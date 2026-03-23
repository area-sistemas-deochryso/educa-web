// #region Pagination
/** Estado de paginación de una tabla server-side */
export interface PaginationState {
	page: number;
	pageSize: number;
	total: number;
}

/**
 * Resultado paginado genérico.
 * Compatible con PaginatedResponse de BaseRepository.
 */
export interface PaginatedResult<T> {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}
// #endregion
