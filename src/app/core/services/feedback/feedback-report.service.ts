// #region Imports
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { type PaginatedResult } from '@core/services/facades';

import {
	ActualizarEstadoReporteRequest,
	CrearReporteRequest,
	ReporteUsuarioDetalleDto,
	ReporteUsuarioEstadisticasDto,
	ReporteUsuarioListaDto,
} from './feedback-report.models';

// #endregion
// #region Implementation
/**
 * Gateway HTTP del módulo de reportes de usuario.
 * El response interceptor ya desempaca `ApiResponse<T>`, por eso tipamos el `get/post` con T directo.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackReportService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/reportes-usuario`;

	// #region POST — Registrar reporte (anónimo permitido)
	/**
	 * Envía un reporte. Si la llamada va envuelta en `WalFacadeHelper.execute`,
	 * el sync engine del WAL inyecta su propio `X-Idempotency-Key` con el UUID
	 * de la entry (garantía de dedup cross-retry y cross-reload). Pasar
	 * `idempotencyKey` manualmente solo tiene sentido para call-sites que NO
	 * usan WAL (por ejemplo, tests).
	 */
	crear(dto: CrearReporteRequest, idempotencyKey?: string): Observable<{ id: number }> {
		const options = idempotencyKey
			? { headers: new HttpHeaders({ 'X-Idempotency-Key': idempotencyKey }) }
			: undefined;
		return this.http.post<{ id: number }>(this.apiUrl, dto, options);
	}
	// #endregion

	// #region GET — Admin
	listar(params: {
		tipo?: string | null;
		estado?: string | null;
		desde?: string | null;
		hasta?: string | null;
		q?: string | null;
		correlationId?: string | null;
		page?: number;
		pageSize?: number;
	}): Observable<PaginatedResult<ReporteUsuarioListaDto>> {
		const httpParams: Record<string, string> = {};
		if (params.tipo) httpParams['tipo'] = params.tipo;
		if (params.estado) httpParams['estado'] = params.estado;
		if (params.desde) httpParams['desde'] = params.desde;
		if (params.hasta) httpParams['hasta'] = params.hasta;
		if (params.q) httpParams['q'] = params.q;
		if (params.correlationId) httpParams['correlationId'] = params.correlationId;
		httpParams['page'] = String(params.page ?? 1);
		httpParams['pageSize'] = String(params.pageSize ?? 20);
		return this.http.get<PaginatedResult<ReporteUsuarioListaDto>>(this.apiUrl, { params: httpParams });
	}

	obtenerEstadisticas(): Observable<ReporteUsuarioEstadisticasDto> {
		return this.http.get<ReporteUsuarioEstadisticasDto>(`${this.apiUrl}/estadisticas`);
	}

	obtenerDetalle(id: number): Observable<ReporteUsuarioDetalleDto> {
		return this.http.get<ReporteUsuarioDetalleDto>(`${this.apiUrl}/${id}`);
	}
	// #endregion

	// #region GET — Export CSV (admin)
	exportarCsv(params: {
		tipo?: string | null;
		estado?: string | null;
		desde?: string | null;
		hasta?: string | null;
		q?: string | null;
		correlationId?: string | null;
	}): Observable<Blob> {
		let httpParams = new HttpParams();
		if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
		if (params.estado) httpParams = httpParams.set('estado', params.estado);
		if (params.desde) httpParams = httpParams.set('desde', params.desde);
		if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
		if (params.q) httpParams = httpParams.set('q', params.q);
		if (params.correlationId) httpParams = httpParams.set('correlationId', params.correlationId);
		return this.http.get(`${this.apiUrl}/export`, { params: httpParams, responseType: 'blob' });
	}
	// #endregion

	// #region PATCH — Cambio de estado (admin)
	actualizarEstado(id: number, dto: ActualizarEstadoReporteRequest): Observable<string> {
		return this.http.patch<string>(`${this.apiUrl}/${id}/estado`, dto);
	}
	// #endregion

	// #region DELETE — Eliminación manual (admin)
	eliminar(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
	// #endregion
}
// #endregion
