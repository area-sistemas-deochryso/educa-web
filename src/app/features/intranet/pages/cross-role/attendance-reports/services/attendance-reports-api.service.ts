import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@config';
import type { Observable } from 'rxjs';
import { formatDateLocalIso } from '@core/helpers';
import type { ReporteFiltrado, ReporteFilters, TendenciaAsistencia, TendenciaRangoTipo } from '../models';

@Injectable({ providedIn: 'root' })
export class AttendanceReportsApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ReportesAsistencia`;

	// #region Consultas
	getReporte(filters: ReporteFilters): Observable<ReporteFiltrado> {
		const params = this.buildParams(filters);
		return this.http.get<ReporteFiltrado>(`${this.apiUrl}/datos`, { params });
	}

	/** Serie temporal por tipo de persona (Semana: ~5 puntos día a día, Mes: 4-5 puntos semana a semana). */
	getTendencia(
		rango: TendenciaRangoTipo,
		fecha: Date,
		sedeId?: number | null,
	): Observable<TendenciaAsistencia> {
		let params = new HttpParams().set('rango', rango).set('fecha', formatDateLocalIso(fecha));
		if (sedeId) params = params.set('sedeId', sedeId.toString());
		return this.http.get<TendenciaAsistencia>(`${this.apiUrl}/tendencia`, { params });
	}

	descargarPdf(filters: ReporteFilters): Observable<Blob> {
		const params = this.buildParams(filters);
		return this.http.get(`${this.apiUrl}/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	descargarExcel(filters: ReporteFilters): Observable<Blob> {
		const params = this.buildParams(filters);
		return this.http.get(`${this.apiUrl}/excel`, {
			params,
			responseType: 'blob',
		});
	}
	// #endregion

	// #region Helpers
	private buildParams(filters: ReporteFilters): HttpParams {
		const fecha = formatDateLocalIso(filters.fecha);
		let params = new HttpParams()
			.set('filtro', filters.estado)
			.set('rango', filters.rango)
			.set('fecha', fecha)
			.set('tipoPersona', filters.tipoPersona);
		if (filters.tipoPersona !== 'P' && filters.tipoPersona !== 'A'
			&& filters.tipoPersona !== 'C' && filters.tipoPersona !== 'M') {
			params = params.set('salones', filters.salonesSeleccionados.join(','));
		}
		if (filters.sedeId) {
			params = params.set('sedeId', filters.sedeId.toString());
		}
		return params;
	}
	// #endregion
}
