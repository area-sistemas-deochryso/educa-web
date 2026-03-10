import { Observable } from 'rxjs';

// #region Types
/** Supported WAL operations. */
export type WalOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE' | 'CUSTOM';
/** Supported HTTP methods for WAL entries. */
export type WalHttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH';
/** WAL entry lifecycle status. */
export type WalEntryStatus =
	| 'PENDING'
	| 'IN_FLIGHT'
	| 'COMMITTED'
	| 'FAILED'
	| 'CONFLICT'
	| 'REQUIRES_MIGRATION';
/** Consistency level for WAL operations. */
export type WalConsistencyLevel =
	| 'optimistic'
	| 'optimistic-confirm'
	| 'server-confirmed'
	| 'serialized';
// #endregion

// #region WAL Entry (persisted in IndexedDB)
/**
 * WAL entry persisted in IndexedDB.
 */
export interface WalEntry {
	/** UUID - also used as X-Idempotency-Key header */
	id: string;
	timestamp: number;
	operation: WalOperation;
	/** Domain resource: 'usuarios', 'horarios', etc. */
	resourceType: string;
	/** For UPDATE/DELETE/TOGGLE - the specific resource ID */
	resourceId?: number | string;
	/** Full API endpoint URL */
	endpoint: string;
	method: WalHttpMethod;
	/** Request body (must be JSON-serializable) */
	payload: unknown;
	status: WalEntryStatus;
	/** Current retry count */
	retries: number;
	/** Maximum retries before marking FAILED (default: 5) */
	maxRetries: number;
	/** Last error message */
	error?: string;
	/** Timestamp when server confirmed */
	committedAt?: number;
	/** Timestamp when permanently failed */
	failedAt?: number;
	/** Next retry timestamp (exponential backoff) */
	nextRetryAt?: number;
	/** Schema version when entry was created. Used for migration on deploy changes. */
	schemaVersion?: number;
	/** Consistency level for this operation (default: 'optimistic'). */
	consistencyLevel?: WalConsistencyLevel;
}
// #endregion

// #region Mutation Config (used by facades)
/**
 * Optimistic UI handlers for WAL mutations.
 */
export interface WalOptimisticConfig {
	/** Apply optimistic update to store immediately */
	apply: () => void;
	/** Rollback optimistic update on failure */
	rollback: () => void;
}

/**
 * WAL mutation configuration for facades.
 */
export interface WalMutationConfig<T = unknown> {
	operation: WalOperation;
	resourceType: string;
	resourceId?: number | string;
	endpoint: string;
	method: WalHttpMethod;
	/** Request body (must be JSON-serializable) */
	payload: unknown;
	/** Factory that creates the HTTP Observable (reused on retry) */
	http$: () => Observable<T>;
	/** Called when server confirms success */
	onCommit: (result: T) => void;
	/** Called on permanent failure (after max retries) */
	onError: (error: unknown) => void;
	/** Optimistic UI support */
	optimistic?: WalOptimisticConfig;
	/** Override default max retries (default: 5) */
	maxRetries?: number;
	/** Consistency level (default: 'optimistic'). */
	consistencyLevel?: WalConsistencyLevel;
}
// #endregion

// #region Process Result
/** Result of processing a WAL entry. */
export type WalProcessResult =
	| {
			status: 'COMMITTED';
			entryId: string;
			/** Domain resource type (e.g. 'usuarios', 'horarios') */
			resourceType?: string;
			/** False when committed post-reload without onCommit callback */
			hadCallback?: boolean;
	  }
	| { status: 'RETRYING'; entryId: string; retries: number; nextRetryAt: number }
	| { status: 'FAILED'; entryId: string; error: string }
	| { status: 'CONFLICT'; entryId: string }
	| { status: 'REQUIRES_MIGRATION'; entryId: string; fromVersion: number };
// #endregion

// #region Stats
/** Aggregated WAL counts by status. */
export interface WalStats {
	pending: number;
	inFlight: number;
	failed: number;
	committed: number;
	conflict: number;
}
// #endregion

// #region Cache Invalidation Map
/**
 * Maps WAL resourceType to SW cache patterns for automatic invalidation.
 * After a WAL entry commits or fails (rollback), the sync engine
 * invalidates all matching cache patterns so subsequent GETs hit the network.
 */
export const WAL_CACHE_MAP: Record<string, string[]> = {
	usuarios: ['/api/sistema/usuarios'],
	horarios: ['/api/horario'],
	Curso: ['/api/sistema/cursos'],
	Vista: ['/api/sistema/permisos/vistas'],
	'permisos-rol': ['/api/sistema/permisos/rol'],
	PermisoUsuario: ['/api/sistema/permisos/usuario'],
	CursoContenido: ['/api/CursoContenido'],
	CursoContenidoArchivo: ['/api/CursoContenido'],
	CursoContenidoSemana: ['/api/CursoContenido'],
	CursoContenidoTarea: ['/api/CursoContenido'],
	TareaArchivo: ['/api/CursoContenido'],
	AsistenciaCurso: ['/api/AsistenciaCurso'],
	Calificacion: ['/api/Calificacion'],
	GrupoContenido: ['/api/GrupoContenido'],
	Conversacion: ['/api/conversaciones'],
};
// #endregion

// #region Constants
/**
 * Current WAL entry schema version.
 * Increment when deploy changes DTO structure, endpoint paths, or payload format.
 * Entries with older versions are marked REQUIRES_MIGRATION on recovery.
 */
export const CURRENT_WAL_SCHEMA_VERSION = 1;

/** Default WAL configuration values. */
export const WAL_DEFAULTS = {
	MAX_RETRIES: 5,
	/** Max backoff delay in ms (30 seconds) */
	MAX_BACKOFF_MS: 30_000,
	/** Base backoff delay in ms */
	BASE_BACKOFF_MS: 1_000,
	/** How long to keep committed entries (24 hours) */
	COMMITTED_TTL_MS: 24 * 60 * 60 * 1_000,
	/** Sync engine polling interval (10 seconds) */
	SYNC_INTERVAL_MS: 10_000,
	/** Idempotency header name */
	IDEMPOTENCY_HEADER: 'X-Idempotency-Key',
	/** Clock skew threshold in ms (5 minutes) */
	CLOCK_SKEW_THRESHOLD_MS: 5 * 60 * 1_000,
} as const;
// #endregion

// #region Migration Types
/**
 * Migration function that transforms a WAL entry from an older schema version.
 * Return the migrated entry or null to discard it.
 */
export type WalMigrationFn = (entry: WalEntry) => WalEntry | null;

/**
 * Registry of migrations keyed by source version.
 * Each migration upgrades from version N to N+1.
 */
export type WalMigrationRegistry = Map<number, WalMigrationFn>;
// #endregion

// #region Metrics Types
/** Snapshot of WAL sync metrics (development only). */
export interface WalMetrics {
	/** Total entries processed since app start. */
	totalProcessed: number;
	/** Total commits since app start. */
	totalCommits: number;
	/** Total failures since app start. */
	totalFailures: number;
	/** Total conflicts since app start. */
	totalConflicts: number;
	/** Average sync latency in ms (last 50 entries). */
	avgLatencyMs: number;
	/** Oldest pending entry age in ms, or 0. */
	oldestPendingAgeMs: number;
	/** Estimated WAL size in bytes. */
	estimatedSizeBytes: number;
	/** Clock skew delta in ms (server - local). Positive = local is behind. */
	clockSkewMs: number;
	/** Number of coalesced (merged) entries since app start. */
	totalCoalesced: number;
}
// #endregion
