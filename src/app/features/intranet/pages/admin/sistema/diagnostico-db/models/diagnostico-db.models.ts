// #region Resource stats
export interface ResourceStatsSnapshotDto {
	timestamp: string;
	cpuPercent: number;
	dataIoPercent: number;
	logWritePercent: number;
	memoryUsagePercent: number;
}
// #endregion

// #region Top queries
export interface TopQueryDto {
	sqlText: string;
	executionCount: number;
	avgCpuMs: number;
	totalReads: number;
	lastExecutionTime: string;
}
// #endregion

// #region Active blocking
export interface ActiveBlockingSessionDto {
	sessionId: number;
	blockingSessionId: number | null;
	waitType: string;
	waitTimeMs: number;
	sqlText: string;
}
// #endregion

// #region Storage
export interface DatabaseFileStatsDto {
	fileName: string;
	fileType: string;
	totalMb: number;
	usedMb: number;
	freeMb: number;
	fillPercent: number;
}
// #endregion

// #region Table sizes
export interface TableSizeDto {
	tableName: string;
	rowCount: number;
	usedMb: number;
	reservedMb: number;
}
// #endregion

// #region Missing indexes
export interface MissingIndexDto {
	tableName: string;
	equalityColumns: string;
	inequalityColumns: string;
	includedColumns: string;
	estimatedImpact: number;
}
// #endregion

// #region Index fragmentation
export interface IndexFragmentationDto {
	tableName: string;
	indexName: string;
	indexType: string;
	pageCount: number;
	percentUsed: number;
	percentEmpty: number;
	fragmentationPercent: number;
}
// #endregion

// #region Unused indexes
export interface UnusedIndexDto {
	tableName: string;
	indexName: string;
	totalWrites: number;
	totalReads: number;
}
// #endregion

// #region Identity values
export interface IdentityValueDto {
	tableName: string;
	columnName: string;
	currentValue: number;
	maxValue: number;
	percentConsumed: number;
}
// #endregion
