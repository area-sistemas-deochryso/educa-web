import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	HealthHistoryResolution,
	RuntimeHealthHistoryResponse,
	RuntimeHealthSnapshot,
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
}
