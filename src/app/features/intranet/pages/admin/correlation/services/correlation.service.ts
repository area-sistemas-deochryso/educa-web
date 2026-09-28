import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { CorrelationSearchFiltro, CorrelationSnapshot } from '../models';

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

	/**
	 * Plan 41 F5 BE — `GET /api/sistema/correlation/search` devuelve
	 * `ApiResponse<List<string>>` (CorrelationIds). Query params omitidos
	 * cuando son null/undefined/vacíos.
	 */
	search(filtro: CorrelationSearchFiltro): Observable<string[]> {
		let params = new HttpParams().set('query', filtro.query);
		if (filtro.dni) params = params.set('dni', filtro.dni);
		if (filtro.desde) params = params.set('desde', filtro.desde);
		if (filtro.hasta) params = params.set('hasta', filtro.hasta);
		return this.http.get<string[]>(`${this.apiUrl}/search`, { params });
	}
}
