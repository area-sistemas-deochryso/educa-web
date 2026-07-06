import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { toLocalIso } from '@core/helpers';
import { type PaginatedResult } from '@core/services/facades';

import {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	RateLimitEventFiltro,
	RateLimitEventListaDto,
	RateLimitStats,
} from '../models';

@Injectable({ providedIn: 'root' })
export class RateLimitEventsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/rate-limit-events`;

	// #region Consultas
	listar(filtro: RateLimitEventFiltro): Observable<PaginatedResult<RateLimitEventListaDto>> {
		let params = this.buildFilterParams(filtro);
		params = params.set('page', String(filtro.page ?? DEFAULT_PAGE));
		params = params.set('pageSize', String(filtro.pageSize ?? DEFAULT_PAGE_SIZE));

		return this.http.get<PaginatedResult<RateLimitEventListaDto>>(this.apiUrl, { params });
	}

	getStats(horas: number): Observable<RateLimitStats> {
		const params = new HttpParams().set('horas', String(horas));
		return this.http.get<RateLimitStats>(`${this.apiUrl}/stats`, { params });
	}
	// #endregion

	// #region Export CSV
	exportarCsv(filtro: RateLimitEventFiltro): Observable<Blob> {
		const params = this.buildFilterParams(filtro);
		return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
	}
	// #endregion

	// #region Helpers
	private buildFilterParams(filtro: RateLimitEventFiltro): HttpParams {
		let params = new HttpParams();

		if (filtro.dni) params = params.set('dni', filtro.dni);
		if (filtro.rol) params = params.set('rol', filtro.rol);
		if (filtro.endpoint) params = params.set('endpoint', filtro.endpoint);
		if (filtro.policy) params = params.set('policy', filtro.policy);
		if (filtro.soloRechazados) params = params.set('soloRechazados', 'true');
		if (filtro.desde) params = params.set('desde', toLocalIso(filtro.desde));
		if (filtro.hasta) params = params.set('hasta', toLocalIso(filtro.hasta));
		if (filtro.correlationId) params = params.set('correlationId', filtro.correlationId);

		return params;
	}
	// #endregion
}
