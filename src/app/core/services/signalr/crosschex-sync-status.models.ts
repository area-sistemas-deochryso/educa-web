// #region Types

/** Estados del job de sincronización CrossChex (mirror del BE). */
export type SyncEstado = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/**
 * Mirror de `CrossChexSyncStatusDto` del BE.
 * Shape exacto que llega como payload del evento SignalR `"SyncProgress"` y
 * como body de `GET /api/asistencia-admin/sync/{jobId}/status`.
 */
export interface CrossChexSyncStatusDto {
	jobId: string;
	estado: SyncEstado;
	pagina: number | null;
	totalPaginas: number | null;
	fase: string | null;
	mensaje: string | null;
	iniciadoEn: string;
	finalizadoEn: string | null;
	error: string | null;
}

/**
 * Mirror de `CrossChexSyncAceptadoDto` del BE.
 * Body del 202 Accepted de `POST /sync` y del 409 Conflict cuando hay job activo.
 */
export interface CrossChexSyncAceptadoDto {
	jobId: string;
	estado: SyncEstado;
}

// #endregion
