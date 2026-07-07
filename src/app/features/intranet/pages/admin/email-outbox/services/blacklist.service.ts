import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { type PaginatedResult } from '@core/services/facades';
import {
	BlacklistFiltros,
	CrearBlacklistRequest,
	DespejarBlacklistResponse,
	EmailBlacklistEntry,
	TrendPunto,
} from '@data/models';

/**
 * Plan 38 Chat 5 — gateway HTTP del dominio blacklist.
 *
 * Endpoints (Chat 3 BE deployado, `Educa.API/Controllers/Sistema/EmailBlacklistController.cs`):
 *   - `GET    /api/sistema/email-blacklist`         → listado paginado server-side (variante A `pagination.md`).
 *   - `POST   /api/sistema/email-blacklist`         → alta manual idempotente (`MANUAL` o `BULK_IMPORT`).
 *   - `DELETE /api/sistema/email-blacklist/{correo}` → despeje (soft, INV-D03).
 *
 * El interceptor `apiResponseInterceptor` desempaca `ApiResponse<T>` automáticamente
 * (ver memoria `feedback_api_response_unwrap.md`). Las respuestas tipadas reflejan
 * el contenido directo, no el wrapper.
 */
@Injectable({ providedIn: 'root' })
export class BlacklistService {
	private readonly http = inject(HttpClient);
	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-blacklist`;

	// #region Consultas
	getPaginado(
		filtros: BlacklistFiltros,
		page: number,
		pageSize: number,
	): Observable<PaginatedResult<EmailBlacklistEntry>> {
		let params = new HttpParams()
			.set('page', page)
			.set('pageSize', pageSize);
		if (filtros.estado) params = params.set('estado', filtros.estado);
		if (filtros.motivo) params = params.set('motivo', filtros.motivo);
		if (filtros.q) params = params.set('q', filtros.q);
		return this.http.get<PaginatedResult<EmailBlacklistEntry>>(this.apiBase, { params });
	}
	// #endregion

	// #region Mutaciones
	crear(request: CrearBlacklistRequest): Observable<EmailBlacklistEntry> {
		return this.http.post<EmailBlacklistEntry>(this.apiBase, request);
	}

	despejar(correo: string): Observable<DespejarBlacklistResponse> {
		const encoded = encodeURIComponent(correo);
		return this.http.delete<DespejarBlacklistResponse>(`${this.apiBase}/${encoded}`);
	}

	unblock(id: number, motivo: string): Observable<DespejarBlacklistResponse> {
		return this.http.post<DespejarBlacklistResponse>(
			`${this.apiBase}/${id}/unblock`,
			{ motivo },
		);
	}

	getTrend(days = 30): Observable<TrendPunto[]> {
		const params = new HttpParams().set('days', days);
		return this.http.get<TrendPunto[]>(`${this.apiBase}/trend`, { params });
	}
	// #endregion
}
