// #region Imports
import { InjectionToken } from '@angular/core';

// #endregion
// #region Implementation
export interface RequestTraceEntry {
	id: string;
	requestId: string;
	method: string;
	url: string;
	status: number | null;
	ok: boolean;
	durationMs: number;
	startedAt: Date;
	endedAt: Date;
	error?: unknown;
}

export interface RequestTraceConfig {
	/** Even if true, trace only runs in dev mode */
	enabled?: boolean;

	/** Max entries kept in memory */
	maxEntries?: number;

	/** Default filter if storage key is empty */
	defaultPattern?: string;

	/** localStorage key for filter pattern (default "TRACE_HTTP") */
	storageKey?: string;

	/** localStorage key for max entries (default "TRACE_HTTP_MAX") */
	storageMaxKey?: string;

	/** localStorage key for enabled flag (default "TRACE_HTTP_ENABLED") */
	storageEnabledKey?: string;
}

export const REQUEST_TRACE_CONFIG = new InjectionToken<RequestTraceConfig>(
	'REQUEST_TRACE_CONFIG',
);
// #endregion
