import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { CorrelationSnapshot } from '../models';

@Injectable({ providedIn: 'root' })
export class CorrelationService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/correlation`;

	/**
	 * Plan 32 Chat 3 BE — `GET /api/sistema/correlation/{id}` devuelve
	 * `ApiResponse<CorrelationSnapshotDto>`. El interceptor de respuesta hace
	 * unwrap automático, así que aquí tipamos directo el inner DTO.
	 */
	getSnapshot(correlationId: string): Observable<CorrelationSnapshot> {
		const encoded = encodeURIComponent(correlationId);
		return this.http.get<CorrelationSnapshot>(`${this.apiUrl}/${encoded}`);
	}
}
