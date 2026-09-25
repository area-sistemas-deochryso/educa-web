// #region Wire Response Shapes
export interface ApiResponse {
	mensaje: string;
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
