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

// #region F3 — Alerts & Thresholds

export type ThresholdDirection = 'Above' | 'Below';
export type AlertLevel = 'warn' | 'critical';

export interface ThresholdConfig {
	metricKey: string;
	warnValue: number;
	criticalValue: number;
	direction: ThresholdDirection;
}

export interface RuntimeHealthAlert {
	rhsCodId: number;
	timestamp: string;
	metricKey: string;
	value: number;
	alertLevel: AlertLevel;
	thresholdBreached: number;
	snapshotPattern: SaturationPattern;
}

export const METRIC_LABELS: Record<string, string> = {
	'requests.p95': 'Requests p95 (ms)',
	'requests.p99': 'Requests p99 (ms)',
	'threadPool.queueLength': 'Cola ThreadPool',
	'db.activeConnections': 'Conexiones BD activas',
	'gc.heapMb': 'Heap (MB)',
	'db.p95LatencyMs': 'BD p95 latencia (ms)',
};

export const ALERT_RECOMMENDATIONS: Record<string, string> = {
	'requests.p95': 'Verificar consultas lentas en la tabla de slow requests',
	'requests.p99': 'Verificar consultas lentas — p99 elevado indica outliers',
	'threadPool.queueLength': 'Posible starvation — revisar consultas lentas que retienen threads',
	'db.activeConnections': 'Pool exhaustion — revisar consultas lentas que retienen conexiones',
	'gc.heapMb': 'Presión de memoria alta — considerar Force GC',
	'db.p95LatencyMs': 'Latencia BD alta — revisar queries pesadas',
};

export const RECOMMENDATION_TAB_TARGETS: Record<string, string> = {
	'requests.p95': 'slow',
	'requests.p99': 'slow',
	'threadPool.queueLength': 'slow',
	'db.activeConnections': 'slow',
	'db.p95LatencyMs': 'slow',
};

// #endregion

// #region F4 — Diagnostics

export interface ForceGcResult {
	heapBeforeMB: number;
	heapAfterMB: number;
	collectedMB: number;
}

export interface SlowRequestEntry {
	path: string;
	p50: number;
	p95: number;
	p99: number;
	count: number;
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
