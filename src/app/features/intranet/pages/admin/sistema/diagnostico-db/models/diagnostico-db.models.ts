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
}
// #endregion
