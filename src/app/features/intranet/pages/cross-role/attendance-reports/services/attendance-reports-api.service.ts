import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@config';
import type { Observable } from 'rxjs';
import type { ReporteFiltrado, ReporteFilters } from '../models';

@Injectable({ providedIn: 'root' })
export class AttendanceReportsApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ReportesAsistencia`;

	// #region Consultas
	getReporte(filters: ReporteFilters): Observable<ReporteFiltrado> {
		const params = this.buildParams(filters);
		return this.http.get<ReporteFiltrado>(`${this.apiUrl}/datos`, { params });
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
		const fecha = filters.fecha.toISOString().split('T')[0];
		let params = new HttpParams()
			.set('filtro', filters.estado)
			.set('rango', filters.rango)
			.set('fecha', fecha)
			.set('tipoPersona', filters.tipoPersona);
		// BE ignora salones cuando tipoPersona = 'P'; no enviarlos evita ruido en el query
		if (filters.tipoPersona !== 'P') {
			params = params.set('salones', filters.salonesSeleccionados.join(','));
		}
		return params;
	}
	// #endregion
}
