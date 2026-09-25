// #region Pagination
/** Estado de paginación de una tabla server-side */
export interface PaginationState {
	page: number;
	pageSize: number;
	total: number;
}

// PaginatedResponse vive en @data (contrato de shape de datos, no de UI) — reexportado acá por compat.
export type { PaginatedResponse } from '@data/models';
// #endregion
