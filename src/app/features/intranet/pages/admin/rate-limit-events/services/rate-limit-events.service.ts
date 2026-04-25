import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	DEFAULT_TAKE,
	RateLimitEventFiltro,
	RateLimitEventListaDto,
	RateLimitStats,
} from '../models';

@Injectable({ providedIn: 'root' })
export class RateLimitEventsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/rate-limit-events`;

	// #region Consultas
	listar(filtro: RateLimitEventFiltro): Observable<RateLimitEventListaDto[]> {
		let params = new HttpParams().set('take', String(filtro.take ?? DEFAULT_TAKE));

		if (filtro.dni) params = params.set('dni', filtro.dni);
		if (filtro.rol) params = params.set('rol', filtro.rol);
		if (filtro.endpoint) params = params.set('endpoint', filtro.endpoint);
		if (filtro.policy) params = params.set('policy', filtro.policy);
		if (filtro.soloRechazados) params = params.set('soloRechazados', 'true');
		if (filtro.desde) params = params.set('desde', filtro.desde.toISOString());
		if (filtro.hasta) params = params.set('hasta', filtro.hasta.toISOString());
		// Plan 32 Chat 4 — el query param correlationId se envía al BE igualmente.
		// Hoy el BE lo ignora (no está en RateLimitEventFiltroDto); el filter
		// efectivo se aplica client-side en el facade. Cuando el BE lo soporte,
		// el filtrado pasa a ser server-side sin tocar acá.
		if (filtro.correlationId) params = params.set('correlationId', filtro.correlationId);

		return this.http.get<RateLimitEventListaDto[]>(this.apiUrl, { params });
	}

	getStats(horas: number): Observable<RateLimitStats> {
		const params = new HttpParams().set('horas', String(horas));
		return this.http.get<RateLimitStats>(`${this.apiUrl}/stats`, { params });
	}
	// #endregion
}
