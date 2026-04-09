// #region Pagination
/** Estado de paginación de una tabla server-side */
export interface PaginationState {
	page: number;
	pageSize: number;
	total: number;
}

/** Respuesta paginada de la API */
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}
// #endregion
