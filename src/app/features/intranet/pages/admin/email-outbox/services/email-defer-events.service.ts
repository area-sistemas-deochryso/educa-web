import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '@config/environment';
import { type PaginatedResult } from '@core/services/facades';
import {
	DeferEventTipo,
	EmailDeferEventDto,
	EmailDeferEventFiltros,
	TrendPunto,
} from '@data/models';

/**
 * Plan 37 Chat 3 — gateway HTTP del timeline EmailDeferEvent.
 *
 * Endpoint: GET /api/sistema/email-outbox/defer-events
 * Server-paginated (variante A wrapper paginado, ver `rules/pagination.md`).
 * Read-only — no mutations.
 */
@Injectable({ providedIn: 'root' })
export class EmailDeferEventsService {
	private readonly http = inject(HttpClient);
	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-outbox/defer-events`;

	// Cache de catálogo: una sola request por sesión. BE además cachea con TTL 1h.
	private catalogo$: Observable<DeferEventTipo[]> | null = null;

	getPaginado(
		filtros: EmailDeferEventFiltros,
		page: number,
		pageSize: number,
	): Observable<PaginatedResult<EmailDeferEventDto>> {
		let params = new HttpParams().set('page', page).set('pageSize', pageSize);
		if (filtros.desde) params = params.set('desde', filtros.desde);
		if (filtros.hasta) params = params.set('hasta', filtros.hasta);
		if (filtros.tipo) params = params.set('tipo', filtros.tipo);
		if (filtros.dominio) params = params.set('dominio', filtros.dominio);
		return this.http.get<PaginatedResult<EmailDeferEventDto>>(this.apiBase, { params });
	}

	/**
	 * Plan 37 Chat 117b — catálogo dinámico de tipos válidos de `EDE_TipoEvento`.
	 *
	 * Endpoint: GET /api/sistema/email-outbox/defer-events/tipos
	 * Cacheado in-memory una vez por sesión vía `shareReplay`.
	 */
	getCatalogoTipos(): Observable<DeferEventTipo[]> {
		if (!this.catalogo$) {
			this.catalogo$ = this.http
				.get<DeferEventTipo[]>(`${this.apiBase}/tipos`)
				.pipe(shareReplay({ bufferSize: 1, refCount: false }));
		}
		return this.catalogo$;
	}

	getTrend(days = 30): Observable<TrendPunto[]> {
		const params = new HttpParams().set('days', days);
		return this.http.get<TrendPunto[]>(`${this.apiBase}/trend`, { params });
	}
}
