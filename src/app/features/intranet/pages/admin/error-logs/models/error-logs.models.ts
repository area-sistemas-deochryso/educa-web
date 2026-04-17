// #region Tipos semánticos
export const ERROR_ORIGENES = ['FRONTEND', 'BACKEND', 'NETWORK'] as const;
export type ErrorOrigen = (typeof ERROR_ORIGENES)[number];

export const ERROR_SEVERIDADES = ['CRITICAL', 'ERROR', 'WARNING'] as const;
export type ErrorSeveridad = (typeof ERROR_SEVERIDADES)[number];

export const BREADCRUMB_TIPOS_ACCION = [
	'NAVIGATION',
	'API_CALL',
	'API_ERROR',
	'USER_ACTION',
	'STATE_CHANGE',
	'WAL_OPERATION',
] as const;
export type BreadcrumbTipoAccion = (typeof BREADCRUMB_TIPOS_ACCION)[number];
// #endregion

// #region DTOs
export interface ErrorLogLista {
	id: number;
	correlationId: string;
	origen: ErrorOrigen;
	severidad: ErrorSeveridad;
	mensaje: string;
	url: string;
	httpStatus: number | null;
	errorCode: string | null;
	usuarioDni: string | null;
	usuarioRol: string | null;
	plataforma: string;
	fecha: string;
	totalBreadcrumbs: number;
}

export interface ErrorLogDetalle {
	id: number;
	orden: number;
	tipoAccion: BreadcrumbTipoAccion;
	descripcion: string;
	ruta: string;
	timestamp: string;
	metadata: string | null;
}

export interface ErrorLogCompleto {
	id: number;
	correlationId: string;
	origen: ErrorOrigen;
	severidad: ErrorSeveridad;
	mensaje: string;
	stackTrace: string | null;
	url: string;
	httpMethod: string | null;
	httpStatus: number | null;
	errorCode: string | null;
	usuarioDni: string | null;
	usuarioRol: string | null;
	plataforma: string;
	userAgent: string | null;
	sourceLocation: string | null;
	fecha: string;
	totalBreadcrumbs: number;
	requestBody: string | null;
	responseBody: string | null;
	requestHeaders: string | null;
	breadcrumbs: ErrorLogDetalle[];
}
// #endregion

// #region Helpers de UI
export const SEVERIDAD_SEVERITY_MAP: Record<ErrorSeveridad, 'danger' | 'warn' | 'info'> = {
	CRITICAL: 'danger',
	ERROR: 'warn',
	WARNING: 'info',
};

export const ORIGEN_ICON_MAP: Record<ErrorOrigen, string> = {
	FRONTEND: 'pi pi-desktop',
	BACKEND: 'pi pi-server',
	NETWORK: 'pi pi-wifi',
};

export const ORIGEN_LABEL_MAP: Record<ErrorOrigen, string> = {
	FRONTEND: 'Error de Frontend',
	BACKEND: 'Error de Backend',
	NETWORK: 'Error de Red',
};

export interface SourceLocation {
	archivo: string | null;
	funcion: string | null;
	linea: number | null;
	columna: number | null;
}

export function parseSourceLocation(json: string | null): SourceLocation | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as SourceLocation;
	} catch {
		return null;
	}
}

export const TIPO_ACCION_ICON_MAP: Record<BreadcrumbTipoAccion, string> = {
	NAVIGATION: 'pi pi-arrow-right',
	API_CALL: 'pi pi-cloud-upload',
	API_ERROR: 'pi pi-exclamation-circle',
	USER_ACTION: 'pi pi-user',
	STATE_CHANGE: 'pi pi-refresh',
	WAL_OPERATION: 'pi pi-database',
};
// #endregion
