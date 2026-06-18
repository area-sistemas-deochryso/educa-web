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

// #region History DTOs (espejo de RuntimeHealthHistoryDto del BE)

export type HealthHistoryResolution =
	| 'Raw'
	| 'OneMinute'
	| 'FiveMinutes'
	| 'FifteenMinutes'
	| 'OneHour';

export interface ThreadPoolHistoryDto {
	workersBusy: number;
	workersMax: number;
	ioBusy: number;
	ioMax: number;
	queueLength: number;
	completedTotal: number;
}

export interface RequestsHistoryDto {
	inFlight: number;
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
	last5MinCount: number;
}

export interface DbHistoryDto {
	activeConnections: number;
	pooledConnections: number;
	dbP95LatencyMs: number;
}

export interface GcHistoryDto {
	gen0: number;
	gen1: number;
	gen2: number;
	heapMb: number;
	totalAllocatedMb: number;
}

export interface RuntimeHealthHistoryDto {
	timestamp: string;
	threadPool: ThreadPoolHistoryDto;
	requests: RequestsHistoryDto;
	db: DbHistoryDto;
	gc: GcHistoryDto;
	saturationPattern: string;
	reason: string | null;
}

export interface RuntimeHealthHistoryResponse {
	data: RuntimeHealthHistoryDto[];
	page: number;
	pageSize: number;
	totalCount: number;
	resolution: HealthHistoryResolution;
}

export type HistoryTimeRange = '30m' | '1h' | '6h' | '24h' | '7d';

export const TIME_RANGE_OPTIONS: { label: string; value: HistoryTimeRange }[] = [
	{ label: '30 min', value: '30m' },
	{ label: '1 hora', value: '1h' },
	{ label: '6 horas', value: '6h' },
	{ label: '24 horas', value: '24h' },
	{ label: '7 días', value: '7d' },
];

export function resolveResolution(range: HistoryTimeRange): HealthHistoryResolution {
	switch (range) {
		case '30m':
		case '1h':
			return 'Raw';
		case '6h':
			return 'OneMinute';
		case '24h':
			return 'FiveMinutes';
		case '7d':
			return 'OneHour';
	}
}

export function resolveTimeRange(range: HistoryTimeRange): { from: Date; to: Date } {
	const to = new Date();
	const from = new Date(to);
	switch (range) {
		case '30m':
			from.setMinutes(from.getMinutes() - 30);
			break;
		case '1h':
			from.setHours(from.getHours() - 1);
			break;
		case '6h':
			from.setHours(from.getHours() - 6);
			break;
		case '24h':
			from.setHours(from.getHours() - 24);
			break;
		case '7d':
			from.setDate(from.getDate() - 7);
			break;
	}
	return { from, to };
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
