import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { type PaginatedResult } from '@core/services/facades';
import {
	EmailDeferEventDto,
	EmailDeferEventFiltros,
} from '@data/models/email-defer-event.models';

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
}
