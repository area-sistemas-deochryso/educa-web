// #region DTO espejo del BE (RuntimeHealthSnapshot, brief 102)

export type SaturationPattern =
	| 'OK'
	| 'STARVATION'
	| 'EXTERNAL_BOTTLENECK'
	| 'OVERLOAD'
	| 'UNKNOWN';

export interface ThreadPoolSnapshot {
	workerThreadsBusy: number;
	workerThreadsMax: number;
	completionPortBusy: number;
	completionPortMax: number;
	queueLength: number;
	completedItemsCount: number;
}

export interface RequestsSnapshot {
	inFlight: number;
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
	countLast5Min: number;
}

export interface DbSnapshot {
	activeConnections: number;
	pooledConnections: number;
	avgLatencyMs: number;
	p95LatencyMs: number;
}

export interface GcSnapshot {
	gen0Collections: number;
	gen1Collections: number;
	gen2Collections: number;
	heapSizeBytes: number;
	totalAllocatedBytes: number;
}

export interface RuntimeHealthSnapshot {
	generatedAt: string;
	pattern: SaturationPattern;
	patternReason: string;
	threadPool: ThreadPoolSnapshot;
	requests: RequestsSnapshot;
	db: DbSnapshot;
	gc: GcSnapshot;
}

// #endregion

// #region Helpers para el widget (severity + label de patrón)

export const PATTERN_LABEL: Record<SaturationPattern, string> = {
	OK: 'OK',
	STARVATION: 'Saturación de threads',
	EXTERNAL_BOTTLENECK: 'Cuello externo (BD)',
	OVERLOAD: 'Sobrecarga',
	UNKNOWN: 'Telemetría no disponible',
};

export const PATTERN_SEVERITY: Record<
	SaturationPattern,
	'success' | 'warn' | 'info' | 'danger'
> = {
	OK: 'success',
	STARVATION: 'warn',
	EXTERNAL_BOTTLENECK: 'warn',
	OVERLOAD: 'danger',
	UNKNOWN: 'info',
};

/**
 * Heurística para detectar fallback INV-S07 del BE: si el patrón es UNKNOWN
 * y todos los counters están en 0, casi seguro que el service entró en
 * try/catch y devolvió un snapshot vacío.
 */
export function isProbableTelemetryFailure(
	snapshot: RuntimeHealthSnapshot | null
): boolean {
	if (!snapshot) return false;
	if (snapshot.pattern !== 'UNKNOWN') return false;
	const tp = snapshot.threadPool;
	const req = snapshot.requests;
	return (
		tp.workerThreadsMax === 0 &&
		tp.queueLength === 0 &&
		req.inFlight === 0 &&
		req.countLast5Min === 0
	);
}

// #endregion
