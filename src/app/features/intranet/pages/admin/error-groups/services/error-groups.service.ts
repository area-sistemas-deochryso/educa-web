import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	CambiarEstadoErrorGroup,
	ErrorGroupDetalle,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorGroupSortField,
	ErrorGroupTrendDto,
	ErrorLogCompleto,
	ErrorLogFull,
	ErrorOrigen,
	ErrorSeveridad,
	HeatmapCalendarCell,
	HeatmapCell,
	OcurrenciaLista,
	SortDireccion,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ErrorGroupsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/error-groups`;
	private readonly apiUrlOcurrencia = `${environment.apiUrl}/api/sistema/errors`;

	// #region Consultas

	getList(
		estado: ErrorGroupEstado | null,
		severidad: ErrorSeveridad | null,
		origen: ErrorOrigen | null,
		q: string | null,
		ocurrenciasMin: number | null,
		excluirRuido: boolean,
		ordenarPor: ErrorGroupSortField,
		direccion: SortDireccion,
		pagina = 1,
		pageSize = 20,
	): Observable<ErrorGroupLista[]> {
		const params: Record<string, string | number | boolean> = {
			pagina, pageSize, ordenarPor, direccion,
		};
		if (estado) params['estado'] = estado;
		if (severidad) params['severidad'] = severidad;
		if (origen) params['origen'] = origen;
		if (q) params['q'] = q;
		if (ocurrenciasMin !== null && ocurrenciasMin > 0) params['ocurrenciasMin'] = ocurrenciasMin;
		if (excluirRuido) params['excluirRuido'] = true;
		return this.http.get<ErrorGroupLista[]>(this.apiUrl, { params });
	}

	getCount(
		estado: ErrorGroupEstado | null,
		severidad: ErrorSeveridad | null,
		origen: ErrorOrigen | null,
		q: string | null,
		ocurrenciasMin: number | null,
		excluirRuido: boolean,
		fechaDesde?: string | null,
		fechaHasta?: string | null,
	): Observable<number> {
		const params: Record<string, string | boolean | number> = {};
		if (estado) params['estado'] = estado;
		if (severidad) params['severidad'] = severidad;
		if (origen) params['origen'] = origen;
		if (q) params['q'] = q;
		if (ocurrenciasMin !== null && ocurrenciasMin > 0) params['ocurrenciasMin'] = ocurrenciasMin;
		if (excluirRuido) params['excluirRuido'] = true;
		if (fechaDesde) params['fechaDesde'] = fechaDesde;
		if (fechaHasta) params['fechaHasta'] = fechaHasta;
		return this.http.get<number>(`${this.apiUrl}/count`, { params });
	}

	getDetalle(id: number): Observable<ErrorGroupDetalle> {
		return this.http.get<ErrorGroupDetalle>(`${this.apiUrl}/${id}`);
	}

	getOcurrencias(grupoId: number, pagina = 1, pageSize = 20): Observable<OcurrenciaLista[]> {
		const params = { pagina, pageSize };
		return this.http.get<OcurrenciaLista[]>(`${this.apiUrl}/${grupoId}/ocurrencias`, { params });
	}

	/**
	 * Detalle completo de una ocurrencia (incluye stack/breadcrumbs/payloads).
	 * Reusa el endpoint legacy de error-logs porque el sub-drawer lo necesita
	 * tal cual lo usaba antes de la migración a grupos.
	 */
	getOcurrenciaCompleta(errorId: number): Observable<ErrorLogCompleto> {
		return this.http.get<ErrorLogCompleto>(`${this.apiUrlOcurrencia}/${errorId}`);
	}

	getOcurrenciaFull(errorId: number): Observable<ErrorLogFull> {
		return this.http.get<ErrorLogFull>(`${this.apiUrlOcurrencia}/${errorId}/full`);
	}

	getErrorList(
		origen: ErrorOrigen | null,
		severidad: ErrorSeveridad | null,
		correlationId: string | null,
		pagina = 1,
		pageSize = 20,
		httpFilter: string | null = null,
		usuarioRol: string | null = null,
	): Observable<ErrorLogCompleto[]> {
		const params: Record<string, string | number> = { pagina, pageSize };
		if (origen) params['origen'] = origen;
		if (severidad) params['severidad'] = severidad;
		if (correlationId) params['correlationId'] = correlationId;
		if (httpFilter) params['httpFilter'] = httpFilter;
		if (usuarioRol) params['usuarioRol'] = usuarioRol;
		return this.http.get<ErrorLogCompleto[]>(this.apiUrlOcurrencia, { params });
	}

	getErrorCount(
		origen: ErrorOrigen | null,
		severidad: ErrorSeveridad | null,
		correlationId: string | null,
		httpFilter: string | null = null,
		usuarioRol: string | null = null,
	): Observable<number> {
		const params: Record<string, string> = {};
		if (origen) params['origen'] = origen;
		if (severidad) params['severidad'] = severidad;
		if (correlationId) params['correlationId'] = correlationId;
		if (httpFilter) params['httpFilter'] = httpFilter;
		if (usuarioRol) params['usuarioRol'] = usuarioRol;
		return this.http.get<number>(`${this.apiUrlOcurrencia}/count`, { params });
	}

	/**
	 * Trend 30d para sparkline (Plan 43 Chat 1.2). Endpoint BE pendiente —
	 * mientras tanto la response 404/500 cae a array vacío vía catchError en
	 * el caller, y el componente renderiza el placeholder "sin actividad".
	 */
	getTrend(grupoId: number): Observable<ErrorGroupTrendDto[]> {
		return this.http.get<ErrorGroupTrendDto[]>(`${this.apiUrl}/${grupoId}/trend`);
	}

	getHeatmap(days = 7, endDate?: string): Observable<HeatmapCell[]> {
		const params: Record<string, string | number> = { days };
		if (endDate) params['endDate'] = endDate;
		return this.http.get<HeatmapCell[]>(
			`${environment.apiUrl}/api/sistema/error-monitoreo/heatmap`,
			{ params },
		);
	}

	getHeatmapCalendar(days = 30, endDate?: string): Observable<HeatmapCalendarCell[]> {
		const params: Record<string, string | number> = { days };
		if (endDate) params['endDate'] = endDate;
		return this.http.get<HeatmapCalendarCell[]>(
			`${environment.apiUrl}/api/sistema/error-monitoreo/heatmap/calendar`,
			{ params },
		);
	}

	// #endregion

	// #region Export CSV

	exportarGrupos(
		estado: ErrorGroupEstado | null,
		severidad: ErrorSeveridad | null,
		origen: ErrorOrigen | null,
		q: string | null,
		ocurrenciasMin: number | null,
		excluirRuido: boolean,
		ordenarPor: ErrorGroupSortField,
		direccion: SortDireccion,
	): Observable<Blob> {
		const params: Record<string, string | boolean> = { ordenarPor, direccion };
		if (estado) params['estado'] = estado;
		if (severidad) params['severidad'] = severidad;
		if (origen) params['origen'] = origen;
		if (q) params['q'] = q;
		if (ocurrenciasMin !== null && ocurrenciasMin > 0) params['ocurrenciasMin'] = String(ocurrenciasMin);
		if (excluirRuido) params['excluirRuido'] = true;
		return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
	}

	exportarOcurrencias(grupoId: number): Observable<Blob> {
		return this.http.get(`${this.apiUrl}/${grupoId}/ocurrencias/export`, { responseType: 'blob' });
	}

	// #endregion

	// #region Mutaciones

	cambiarEstado(id: number, dto: CambiarEstadoErrorGroup): Observable<string> {
		return this.http.patch<string>(`${this.apiUrl}/${id}/estado`, dto);
	}

	eliminar(id: number): Observable<string> {
		return this.http.delete<string>(`${this.apiUrl}/${id}`);
	}

	eliminarMasivo(ids: number[]): Observable<number> {
		return this.http.delete<number>(this.apiUrl, { body: ids });
	}

	// #endregion
}
