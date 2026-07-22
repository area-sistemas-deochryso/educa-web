// #region Tipos semánticos
export const ERROR_ORIGENES = ['FRONTEND', 'BACKEND', 'NETWORK'] as const;
export type ErrorOrigen = (typeof ERROR_ORIGENES)[number];

export const ERROR_SEVERIDADES = ['CRITICAL', 'ERROR', 'WARNING'] as const;
export type ErrorSeveridad = (typeof ERROR_SEVERIDADES)[number];

export const ERROR_GROUP_ESTADOS = [
	'NUEVO',
	'VISTO',
	'EN_PROGRESO',
	'RESUELTO',
	'IGNORADO',
] as const;
export type ErrorGroupEstado = (typeof ERROR_GROUP_ESTADOS)[number];

/** Brief 429 (P68 F7) — espejo de `ordenarPor` en Educa.API `ErrorGroupController`. */
export const ERROR_GROUP_SORT_FIELDS = ['ultimaFecha', 'severidad', 'contadorTotal'] as const;
export type ErrorGroupSortField = (typeof ERROR_GROUP_SORT_FIELDS)[number];
export type SortDireccion = 'asc' | 'desc';

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

// #region DTOs — espejo del Chat 3 BE (Educa.API 0b67b04)
export interface ErrorGroupLista {
	id: number;
	fingerprintCorto: string;
	severidad: ErrorSeveridad;
	mensajeRepresentativo: string;
	url: string;
	httpStatus: number | null;
	errorCode: string | null;
	origen: ErrorOrigen;
	estado: ErrorGroupEstado;
	primeraFecha: string;
	ultimaFecha: string;
	contadorTotal: number;
	contadorPostResolucion: number;
	/** Brief 472 (P68 F9) — COUNT(DISTINCT usuario) con usuario identificado en las ocurrencias del grupo. */
	usuariosUnicos: number;
	rowVersion: string;
}

export interface ErrorGroupDetalle {
	id: number;
	fingerprint: string;
	severidad: ErrorSeveridad;
	mensajeRepresentativo: string;
	url: string;
	httpStatus: number | null;
	errorCode: string | null;
	origen: ErrorOrigen;
	estado: ErrorGroupEstado;
	primeraFecha: string;
	ultimaFecha: string;
	contadorTotal: number;
	contadorPostResolucion: number;
	rowVersion: string;
	observacion: string | null;
	totalOcurrencias: number;
	usuarioReg: string;
	fechaReg: string;
	usuarioMod: string | null;
	fechaMod: string | null;
}

export interface OcurrenciaLista {
	id: number;
	correlationId: string;
	fecha: string;
	httpMethod: string | null;
	httpStatus: number | null;
	mensaje: string;
	url: string;
	usuarioDni: string | null;
	usuarioRol: string | null;
	totalBreadcrumbs: number;
}

export interface CambiarEstadoErrorGroup {
	estado: ErrorGroupEstado;
	observacion?: string | null;
	rowVersion: string;
}

/**
 * Timeline de ocurrencias individuales en la ventana de 30d (Plan 43 Chat 1.2,
 * actualizado para timeline/strip-plot). Espejo del DTO BE `ErrorGroupTrendDto`
 * de `GET /api/sistema/error-groups/{id}/trend`.
 *
 * Contrato: `timestamps` son las fechas ISO de cada ocurrencia individual del
 * grupo en la ventana de 30 días, en orden cronológico ascendente, capadas a
 * un máximo de 300. `truncado=true` indica que el grupo tiene más de 300
 * ocurrencias en la ventana y el array fue recortado.
 */
export interface ErrorGroupTrendDto {
	timestamps: string[];
	truncado: boolean;
}

export interface HeatmapCell {
	dayOfWeek: number;
	hour: number;
	count: number;
	avgDuration: number;
}

export interface HeatmapCalendarCell {
	date: string;
	count: number;
	avgDurationMs: number;
}

/**
 * Fila del Pareto de priorización (brief 433, P68 F8.3). Espejo de `ErrorGroupParetoDto`
 * (BE) — cubre todos los grupos activos (NUEVO/VISTO/EN_PROGRESO), sin paginar,
 * ordenados desc por `score`. El % acumulado se calcula 100% en el FE.
 */
export interface ErrorGroupPareto {
	id: number;
	fingerprintCorto: string;
	mensajeRepresentativo: string;
	severidad: ErrorSeveridad;
	contadorTotal: number;
	/** Brief 472 (P68 F9) — cantidad de ocurrencias posteriores a RESUELTO, flag de regresión. */
	contadorPostResolucion: number;
	/** Brief 472 (P68 F9) — COUNT(DISTINCT usuario) del grupo. */
	usuariosUnicos: number;
	ultimaFecha: string;
	score: number;
}

// #endregion

// #region Matriz de transiciones (espejo BE INV-ET07)
/**
 * Estados activos (NUEVO/VISTO/EN_PROGRESO) transicionan libremente.
 * RESUELTO/IGNORADO son terminales suaves: solo reabren a NUEVO.
 * El idem (X→X) no se incluye — el BE lo tolera como no-op.
 */
export const ESTADO_TRANSITIONS_MAP: Record<ErrorGroupEstado, ErrorGroupEstado[]> = {
	NUEVO: ['VISTO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO'],
	VISTO: ['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO'],
	EN_PROGRESO: ['NUEVO', 'VISTO', 'RESUELTO', 'IGNORADO'],
	RESUELTO: ['NUEVO'],
	IGNORADO: ['NUEVO'],
};
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

export const ESTADO_LABEL_MAP: Record<ErrorGroupEstado, string> = {
	NUEVO: 'Nuevo',
	VISTO: 'Visto',
	EN_PROGRESO: 'En progreso',
	RESUELTO: 'Resuelto',
	IGNORADO: 'Ignorado',
};

export const ESTADO_SEVERITY_MAP: Record<
	ErrorGroupEstado,
	'danger' | 'warn' | 'info' | 'success' | 'secondary'
> = {
	NUEVO: 'danger',
	VISTO: 'warn',
	EN_PROGRESO: 'info',
	RESUELTO: 'success',
	IGNORADO: 'secondary',
};

export const TRACE_CAPA_ICON_MAP: Record<string, string> = {
	CONTROLLER: 'pi pi-globe',
	SERVICE: 'pi pi-cog',
	REPOSITORY: 'pi pi-database',
	SQL: 'pi pi-server',
	EXTERNAL: 'pi pi-cloud',
};

export const TRACE_CAPA_LABEL_MAP: Record<string, string> = {
	CONTROLLER: 'Controller',
	SERVICE: 'Service',
	REPOSITORY: 'Repository',
	SQL: 'SQL',
	EXTERNAL: 'Externo',
};

export const TIPO_ACCION_ICON_MAP: Record<BreadcrumbTipoAccion, string> = {
	NAVIGATION: 'pi pi-arrow-right',
	API_CALL: 'pi pi-cloud-upload',
	API_ERROR: 'pi pi-exclamation-circle',
	USER_ACTION: 'pi pi-user',
	STATE_CHANGE: 'pi pi-refresh',
	WAL_OPERATION: 'pi pi-database',
};
// #endregion

// #region Detalle de ocurrencia (legacy — heredado del subdominio error-logs)
export interface ErrorLogDetalle {
	id: number;
	orden: number;
	tipoAccion: BreadcrumbTipoAccion;
	descripcion: string;
	ruta: string;
	timestamp: string;
	metadata: string | null;
}

export interface ErrorLogTrace {
	id: number;
	orden: number;
	capa: string;
	componente: string;
	metodo: string;
	parametros: string | null;
	duracionMs: number;
	resultado: string;
	errorSnippet: string | null;
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
	clientEnvironment: string | null;
	breadcrumbs: ErrorLogDetalle[];
	trace: ErrorLogTrace[];
}

export interface ErrorGroupContext {
	id: number;
	estado: ErrorGroupEstado;
	observacion: string | null;
	contadorTotal: number;
	contadorPostResolucion: number;
	primeraFecha: string;
	ultimaFecha: string;
	severidad: ErrorSeveridad;
	mensajeRepresentativo: string;
}

export interface ErrorLogCounterpart {
	id: number;
	origen: ErrorOrigen;
	severidad: ErrorSeveridad;
	mensaje: string;
	url: string;
	httpStatus: number | null;
	fecha: string;
}

export interface ErrorLogFull {
	error: ErrorLogCompleto;
	group: ErrorGroupContext | null;
	counterpart: ErrorLogCounterpart | null;
}

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
// #endregion
