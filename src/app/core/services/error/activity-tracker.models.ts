export const BREADCRUMB_TIPOS = [
	'NAVIGATION',
	'API_CALL',
	'API_ERROR',
	'USER_ACTION',
	'STATE_CHANGE',
	'WAL_OPERATION',
] as const;
export type BreadcrumbTipo = (typeof BREADCRUMB_TIPOS)[number];

export interface Breadcrumb {
	tipo: BreadcrumbTipo;
	descripcion: string;
	ruta: string;
	timestamp: number;
	metadata?: Record<string, string>;
}
