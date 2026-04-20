import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { AsistenciaProfesorDto } from '@data/models/attendance.models';
import { PaginatedResponse } from '@shared/models';

/**
 * Gateway HTTP para endpoints de asistencia de profesores
 * (Plan 21 Chat 2 admin + Chat 4 self-service):
 *
 *  JSON admin (Administrativos):
 *  - GET /profesores/{dni}               detalle rango
 *  - GET /profesores                     listado paginado + filtro estado
 *  - GET /profesor/{dni}/dia             día puntual
 *  - GET /profesor/{dni}/mes             mes completo
 *
 *  JSON self-service (Profesor):
 *  - GET /profesor/me/dia                día puntual del profesor autenticado
 *  - GET /profesor/me/mes                mes completo del profesor autenticado
 *
 *  PDF admin:
 *  - GET /profesor/{dni}/dia/pdf
 *  - GET /profesor/{dni}/mes/pdf
 *  - GET /profesores/reporte-filtrado/pdf
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaProfesorApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	// #region Consultas JSON

	/**
	 * Detalle de un profesor con asistencias en un rango dado.
	 * Default backend: últimos 30 días.
	 */
	obtenerAsistenciaProfesor(
		dni: string,
		fechaInicio?: Date,
		fechaFin?: Date,
	): Observable<AsistenciaProfesorDto> {
		const params: Record<string, string> = {};
		if (fechaInicio) params['fechaInicio'] = this.formatDateLocal(fechaInicio);
		if (fechaFin) params['fechaFin'] = this.formatDateLocal(fechaFin);

		return this.http.get<AsistenciaProfesorDto>(`${this.apiUrl}/profesores/${dni}`, { params });
	}

	/**
	 * Listado paginado de profesores con asistencias en el rango.
	 * `estado` filtra por código calculado (A/T/F/J).
	 */
	listarProfesores(
		fechaInicio?: Date,
		fechaFin?: Date,
		estado?: string | null,
		page?: number,
		pageSize?: number,
	): Observable<PaginatedResponse<AsistenciaProfesorDto>> {
		const params: Record<string, string> = {};
		if (fechaInicio) params['fechaInicio'] = this.formatDateLocal(fechaInicio);
		if (fechaFin) params['fechaFin'] = this.formatDateLocal(fechaFin);
		if (estado) params['estado'] = estado;
		if (page !== undefined) params['page'] = page.toString();
		if (pageSize !== undefined) params['pageSize'] = pageSize.toString();

		return this.http.get<PaginatedResponse<AsistenciaProfesorDto>>(`${this.apiUrl}/profesores`, {
			params,
		});
	}

	/**
	 * Día puntual de un profesor específico.
	 */
	obtenerAsistenciaProfesorDia(dni: string, fecha: Date): Observable<AsistenciaProfesorDto> {
		const params = { fecha: this.formatDateLocal(fecha) };
		return this.http.get<AsistenciaProfesorDto>(`${this.apiUrl}/profesor/${dni}/dia`, {
			params,
		});
	}

	/**
	 * Mes completo de un profesor específico.
	 */
	obtenerAsistenciaProfesorMes(
		dni: string,
		mes?: number,
		anio?: number,
	): Observable<AsistenciaProfesorDto> {
		const params: Record<string, string> = {};
		if (mes !== undefined) params['mes'] = mes.toString();
		if (anio !== undefined) params['anio'] = anio.toString();

		return this.http.get<AsistenciaProfesorDto>(`${this.apiUrl}/profesor/${dni}/mes`, {
			params,
		});
	}

	// #endregion
	// #region Self-service (Profesor autenticado)

	/**
	 * Día puntual del profesor autenticado. El backend extrae el DNI del claim.
	 */
	obtenerMiAsistenciaDia(fecha: Date): Observable<AsistenciaProfesorDto> {
		const params = { fecha: this.formatDateLocal(fecha) };
		return this.http.get<AsistenciaProfesorDto>(`${this.apiUrl}/profesor/me/dia`, { params });
	}

	/**
	 * Mes completo del profesor autenticado (default: mes actual).
	 * El backend extrae el DNI del claim.
	 */
	obtenerMiAsistenciaMes(mes?: number, anio?: number): Observable<AsistenciaProfesorDto> {
		const params: Record<string, string> = {};
		if (mes !== undefined) params['mes'] = mes.toString();
		if (anio !== undefined) params['anio'] = anio.toString();

		return this.http.get<AsistenciaProfesorDto>(`${this.apiUrl}/profesor/me/mes`, { params });
	}

	// #endregion
	// #region Descargas PDF

	descargarPdfProfesorDia(dni: string, fecha: Date): Observable<Blob> {
		const params = { fecha: this.formatDateLocal(fecha) };
		return this.http.get(`${this.apiUrl}/profesor/${dni}/dia/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	descargarPdfProfesorMes(dni: string, mes?: number, anio?: number): Observable<Blob> {
		const params: Record<string, string> = {};
		if (mes !== undefined) params['mes'] = mes.toString();
		if (anio !== undefined) params['anio'] = anio.toString();

		return this.http.get(`${this.apiUrl}/profesor/${dni}/mes/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	descargarPdfReporteFiltradoProfesores(
		fechaInicio?: Date,
		fechaFin?: Date,
		estado?: string | null,
	): Observable<Blob> {
		const params: Record<string, string> = {};
		if (fechaInicio) params['fechaInicio'] = this.formatDateLocal(fechaInicio);
		if (fechaFin) params['fechaFin'] = this.formatDateLocal(fechaFin);
		if (estado) params['estado'] = estado;

		return this.http.get(`${this.apiUrl}/profesores/reporte-filtrado/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	// #endregion
	// #region Helpers privados

	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	// #endregion
}
