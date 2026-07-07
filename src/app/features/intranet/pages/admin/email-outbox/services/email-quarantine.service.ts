import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { type PaginatedResult } from '@core/services/facades';
import {
	CrearEmailQuarantineDto,
	EmailQuarantineDetalleDto,
	EmailQuarantineFiltros,
	EmailQuarantineListaDto,
	LiberarEmailQuarantineDto,
	TrendPunto,
} from '@data/models';

/**
 * Plan 37 Chat 3 — gateway HTTP del dominio EmailQuarantine.
 *
 * Endpoints (`Educa.API/Controllers/Sistema/EmailQuarantineController.cs` —
 * Plan 37 Chat 2 BE local awaiting-prod):
 *   - GET    /api/sistema/email-outbox/quarantine        → listado paginado
 *   - GET    /api/sistema/email-outbox/quarantine/{id}   → detalle
 *   - POST   /api/sistema/email-outbox/quarantine        → crear manual
 *   - POST   /api/sistema/email-outbox/quarantine/{id}/release → liberar
 */
@Injectable({ providedIn: 'root' })
export class EmailQuarantineService {
	private readonly http = inject(HttpClient);
	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-outbox/quarantine`;

	// #region Consultas
	getPaginado(
		filtros: EmailQuarantineFiltros,
		page: number,
		pageSize: number,
	): Observable<PaginatedResult<EmailQuarantineListaDto>> {
		let params = new HttpParams().set('page', page).set('pageSize', pageSize);
		if (filtros.estado === 'activa') params = params.set('activas', 'true');
		else if (filtros.estado === 'liberada') params = params.set('activas', 'false');
		if (filtros.motivo) params = params.set('motivo', filtros.motivo);
		if (filtros.q) params = params.set('q', filtros.q);
		return this.http.get<PaginatedResult<EmailQuarantineListaDto>>(this.apiBase, { params });
	}

	getDetalle(id: number): Observable<EmailQuarantineDetalleDto> {
		return this.http.get<EmailQuarantineDetalleDto>(`${this.apiBase}/${id}`);
	}
	// #endregion

	// #region Mutaciones
	crear(request: CrearEmailQuarantineDto): Observable<EmailQuarantineListaDto> {
		return this.http.post<EmailQuarantineListaDto>(this.apiBase, request);
	}

	liberar(
		id: number,
		request: LiberarEmailQuarantineDto,
	): Observable<EmailQuarantineListaDto> {
		return this.http.post<EmailQuarantineListaDto>(
			`${this.apiBase}/${id}/release`,
			request,
		);
	}

	getTrend(days = 30): Observable<TrendPunto[]> {
		const params = new HttpParams().set('days', days);
		return this.http.get<TrendPunto[]>(`${this.apiBase}/trend`, { params });
	}
	// #endregion
}
