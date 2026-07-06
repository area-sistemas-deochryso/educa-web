import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	ForceGcResult,
	HealthHistoryResolution,
	RuntimeHealthAlert,
	RuntimeHealthHistoryResponse,
	RuntimeHealthSnapshot,
	SlowRequestEntry,
	ThresholdConfig,
} from '../models/runtime-health.models';

@Injectable({ providedIn: 'root' })
export class RuntimeHealthService {
	private readonly http = inject(HttpClient);
	private readonly endpoint = `${environment.apiUrl}/api/sistema/runtime-health`;

	getSnapshot(): Observable<RuntimeHealthSnapshot> {
		return this.http.get<RuntimeHealthSnapshot>(this.endpoint);
	}

	getHistory(
		from: Date,
		to: Date,
		resolution: HealthHistoryResolution,
	): Observable<RuntimeHealthHistoryResponse> {
		const params = new HttpParams()
			.set('from', from.toISOString())
			.set('to', to.toISOString())
			.set('resolution', resolution);

		return this.http.get<RuntimeHealthHistoryResponse>(
			`${this.endpoint}/history`,
			{ params },
		);
	}

	// #region F3 — Alerts & Thresholds
	getAlerts(): Observable<RuntimeHealthAlert[]> {
		return this.http.get<RuntimeHealthAlert[]>(`${this.endpoint}/alerts`);
	}

	getThresholds(): Observable<ThresholdConfig[]> {
		return this.http.get<ThresholdConfig[]>(`${this.endpoint}/thresholds`);
	}

	updateThresholds(thresholds: ThresholdConfig[]): Observable<ThresholdConfig[]> {
		return this.http.put<ThresholdConfig[]>(`${this.endpoint}/thresholds`, thresholds);
	}

	deleteAlert(id: number): Observable<string> {
		return this.http.delete<string>(`${this.endpoint}/alerts/${id}`);
	}

	deleteAlerts(ids: number[]): Observable<number> {
		return this.http.delete<number>(`${this.endpoint}/alerts`, { body: ids });
	}
	// #endregion

	// #region F4 — Diagnostics
	forceGc(): Observable<ForceGcResult> {
		return this.http.post<ForceGcResult>(`${this.endpoint}/force-gc`, null);
	}

	getSlowRequests(top = 10): Observable<SlowRequestEntry[]> {
		const params = new HttpParams().set('top', top);
		return this.http.get<SlowRequestEntry[]>(`${this.endpoint}/slow-requests`, { params });
	}
	// #endregion
}
