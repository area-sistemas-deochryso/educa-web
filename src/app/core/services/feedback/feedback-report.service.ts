// #region Imports
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

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
	}): Observable<ReporteUsuarioListaDto[]> {
		const httpParams: Record<string, string> = {};
		if (params.tipo) httpParams['tipo'] = params.tipo;
		if (params.estado) httpParams['estado'] = params.estado;
		if (params.desde) httpParams['desde'] = params.desde;
		if (params.hasta) httpParams['hasta'] = params.hasta;
		return this.http.get<ReporteUsuarioListaDto[]>(this.apiUrl, { params: httpParams });
	}

	obtenerEstadisticas(): Observable<ReporteUsuarioEstadisticasDto> {
		return this.http.get<ReporteUsuarioEstadisticasDto>(`${this.apiUrl}/estadisticas`);
	}

	obtenerDetalle(id: number): Observable<ReporteUsuarioDetalleDto> {
		return this.http.get<ReporteUsuarioDetalleDto>(`${this.apiUrl}/${id}`);
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
