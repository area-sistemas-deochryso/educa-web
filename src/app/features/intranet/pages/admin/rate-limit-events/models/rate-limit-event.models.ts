// #region Tipos semánticos
/**
 * Policies configuradas en el rate limiter del backend.
 * Espejo de los nombres en RateLimitingExtensions.cs.
 * Nota: `null` en DTO = GlobalLimiter (sin nombre).
 */
export const RATE_LIMIT_POLICIES = [
	'global-read',
	'global-write',
	'login',
	'refresh',
	'biometric',
	'feedback',
	'heavy',
] as const;
export type RateLimitPolicy = (typeof RATE_LIMIT_POLICIES)[number];
// #endregion

// #region DTOs (espejo del backend)
/**
 * Evento de rate limiting persistido por telemetría.
 * DNI siempre viene enmascarado ("***5678") — NUNCA desenmascarar ni loggear crudo.
 */
export interface RateLimitEventListaDto {
	id: number;
	correlationId: string | null;
	endpoint: string;
	httpMethod: string;
	/** `null` cuando fue rechazado por GlobalLimiter (sin nombre). Mostrar como "—" o "global". */
	policy: string | null;
	usuarioDniMasked: string | null;
	usuarioRol: string | null;
	limiteEfectivo: number | null;
	tokensConsumidos: number | null;
	/** En F1 siempre true (solo persiste rechazos). F2 habilitará early warnings. */
	fueRechazado: boolean;
	ipAddress: string | null;
	fecha: string;
}

export interface RateLimitEventFiltro {
	dni?: string;
	rol?: string | null;
	endpoint?: string;
	policy?: RateLimitPolicy | null;
	soloRechazados?: boolean;
	desde?: Date | null;
	hasta?: Date | null;
	/**
	 * Plan 32 Chat 4 — filtra eventos por correlationId. Cuando el page se abre
	 * con `?correlationId=<id>` desde el hub, el store lo inicializa acá.
	 * Backend filtra por exact match.
	 */
	correlationId?: string | null;
	/** Paginación server-side. Default page 1 / pageSize 20 en el service. */
	page?: number;
	pageSize?: number;
}

export interface RateLimitBreakdownItem {
	key: string;
	total: number;
	rechazados: number;
}

export interface RateLimitStats {
	horas: number;
	desde: string;
	total: number;
	totalRechazados: number;
	topRoles: RateLimitBreakdownItem[];
	topEndpoints: RateLimitBreakdownItem[];
}
// #endregion

// #region Helpers de UI
export const POLICY_LABEL_FALLBACK = 'global';
export const DEFAULT_STATS_HORAS = 24;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

/** Formato display para policy: `null` → "global". */
export function displayPolicy(policy: string | null): string {
	return policy ?? POLICY_LABEL_FALLBACK;
}
// #endregion
