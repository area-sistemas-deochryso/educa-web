import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '@config/environment';
import { PaginatedResponse } from '@data/repositories';
import {
	AsistenciaDiaConEstadisticas,
	EstadisticasAsistenciaDia,
	EstadisticasDia,
	EstudianteAsistencia,
	GradoSeccion,
	ProfesorSede,
	SalonProfesor,
} from '@data/models/asistencia.models';

@Injectable({ providedIn: 'root' })
export class DirectorAsistenciaApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	// #region Consultas (GET)

	/**
	 * Obtener reporte de asistencia con filtros opcionales
	 * GET /api/ConsultaAsistencia/director/reporte?fecha={fecha}&grado={grado}&seccion={seccion}
	 */
	getReporteDirector(
		fecha?: Date,
		grado?: string,
		seccion?: string,
	): Observable<EstudianteAsistencia[]> {
		const params: Record<string, string> = {};

		if (fecha) {
			params['fecha'] = this.formatDateLocal(fecha);
		}
		if (grado) {
			params['grado'] = grado;
		}
		if (seccion) {
			params['seccion'] = seccion;
		}

		return this.http
			.get<EstudianteAsistencia[]>(`${this.apiUrl}/director/reporte`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener estadisticas del dia
	 * GET /api/ConsultaAsistencia/director/estadisticas?fecha={fecha}
	 */
	getEstadisticasDirector(fecha?: Date): Observable<EstadisticasDia | null> {
		const params: Record<string, string> = {};

		if (fecha) {
			params['fecha'] = this.formatDateLocal(fecha);
		}

		return this.http
			.get<EstadisticasDia>(`${this.apiUrl}/director/estadisticas`, { params })
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Obtener asistencia de un grado/seccion en un dia especifico con estadisticas
	 * GET /api/ConsultaAsistencia/director/asistencia-dia?grado={grado}&seccion={seccion}&fecha={fecha}
	 */
	getAsistenciaDiaDirector(
		grado: string,
		seccion: string,
		fecha: Date,
	): Observable<AsistenciaDiaConEstadisticas> {
		const params: Record<string, string> = {
			grado,
			seccion,
			fecha: this.formatDateLocal(fecha),
		};

		return this.http
			.get<AsistenciaDiaConEstadisticas>(`${this.apiUrl}/director/asistencia-dia`, { params })
			.pipe(
				catchError(() =>
					of({ estudiantes: [], estadisticas: this.getEstadisticasVacias() }),
				),
			);
	}

	/**
	 * Obtener salones de la sede
	 * GET /api/ConsultaAsistencia/director/salones
	 */
	getSalonesDirector(): Observable<SalonProfesor[]> {
		return this.http
			.get<SalonProfesor[]>(`${this.apiUrl}/director/salones`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener profesores de la sede
	 * GET /api/ConsultaAsistencia/director/profesores
	 */
	getProfesoresDirector(): Observable<ProfesorSede[]> {
		return this.http
			.get<ProfesorSede[]>(`${this.apiUrl}/director/profesores`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener asistencias de estudiantes por grado/seccion
	 * GET /api/ConsultaAsistencia/director/grado?grado={grado}&seccion={seccion}&mes={mes}&anio={anio}
	 */
	getAsistenciasGradoDirector(
		grado: string,
		seccion: string,
		mes?: number,
		anio?: number,
	): Observable<EstudianteAsistencia[]> {
		const params: Record<string, string> = {
			grado,
			seccion,
		};

		if (mes !== undefined) {
			params['mes'] = mes.toString();
		}
		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http
			.get<EstudianteAsistencia[]>(`${this.apiUrl}/director/grado`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener asistencias paginadas (infraestructura para datasets grandes)
	 * GET /api/ConsultaAsistencia/director/grado?grado={grado}&seccion={seccion}&mes={mes}&anio={anio}&page={page}&pageSize={pageSize}
	 */
	getAsistenciasGradoDirectorPaginated(
		grado: string,
		seccion: string,
		page: number,
		pageSize: number,
		mes?: number,
		anio?: number,
	): Observable<PaginatedResponse<EstudianteAsistencia>> {
		const params: Record<string, string> = {
			grado,
			seccion,
			page: page.toString(),
			pageSize: pageSize.toString(),
		};

		if (mes !== undefined) {
			params['mes'] = mes.toString();
		}
		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http.get<PaginatedResponse<EstudianteAsistencia>>(
			`${this.apiUrl}/director/grado`,
			{ params },
		);
	}

	/**
	 * Obtener grados/secciones disponibles de la sede
	 * Usa el endpoint de salones y extrae grados/secciones unicos
	 */
	getGradosSeccionesDisponibles(): Observable<GradoSeccion[]> {
		return this.getSalonesDirector().pipe(
			map((salones) => {
				// Mantener el orden del backend (ya ordenado por GRA_Orden)
				const seen = new Set<string>();
				const result: GradoSeccion[] = [];

				salones.forEach((s) => {
					const key = `${s.grado}-${s.seccion}`;
					if (!seen.has(key)) {
						seen.add(key);
						result.push({
							grado: s.grado,
							gradoCodigo: s.gradoCodigo,
							seccion: s.seccion,
						});
					}
				});

				return result;
			}),
		);
	}

	// #endregion

	// #region Descargas PDF

	/**
	 * Descargar PDF de asistencia del dia
	 * GET /api/ConsultaAsistencia/director/asistencia-dia/pdf?grado={grado}&seccion={seccion}&fecha={fecha}
	 */
	descargarPdfAsistenciaDia(grado: string, seccion: string, fecha?: Date): Observable<Blob> {
		const params: Record<string, string> = { grado, seccion };

		if (fecha) {
			params['fecha'] = this.formatDateLocal(fecha);
		}

		return this.http.get(`${this.apiUrl}/director/asistencia-dia/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	/**
	 * Descargar PDF mensual de asistencia de un salon especifico
	 * GET /api/ConsultaAsistencia/director/asistencia-mes/pdf?grado={grado}&seccion={seccion}&mes={mes}&anio={anio}
	 */
	descargarPdfAsistenciaMes(
		grado: string,
		seccion: string,
		mes: number,
		anio: number,
	): Observable<Blob> {
		const params: Record<string, string> = {
			grado,
			seccion,
			mes: mes.toString(),
			anio: anio.toString(),
		};

		return this.http.get(`${this.apiUrl}/director/asistencia-mes/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	/**
	 * Descargar PDF de asistencia por periodo (rango de meses) de un salon
	 * GET /api/ConsultaAsistencia/director/asistencia-periodo/pdf
	 */
	descargarPdfAsistenciaPeriodo(
		grado: string,
		seccion: string,
		mesInicio: number,
		anioInicio: number,
		mesFin: number,
		anioFin: number,
	): Observable<Blob> {
		const params: Record<string, string> = {
			grado,
			seccion,
			mesInicio: mesInicio.toString(),
			anioInicio: anioInicio.toString(),
			mesFin: mesFin.toString(),
			anioFin: anioFin.toString(),
		};

		return this.http.get(`${this.apiUrl}/director/asistencia-periodo/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	/**
	 * Descargar PDF consolidado de todos los salones - Dia
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/dia/pdf?fecha={fecha}
	 */
	descargarPdfTodosSalonesDia(fecha?: Date): Observable<Blob> {
		const params: Record<string, string> = {};

		if (fecha) {
			params['fecha'] = this.formatDateLocal(fecha);
		}

		return this.http.get(`${this.apiUrl}/director/reporte/todos-salones/dia/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	/**
	 * Descargar PDF consolidado de todos los salones - Semana
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/semana/pdf?fechaInicio={fechaInicio}
	 */
	descargarPdfTodosSalonesSemana(fechaInicio?: Date): Observable<Blob> {
		const params: Record<string, string> = {};

		if (fechaInicio) {
			params['fechaInicio'] = this.formatDateLocal(fechaInicio);
		}

		return this.http.get(`${this.apiUrl}/director/reporte/todos-salones/semana/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	/**
	 * Descargar PDF consolidado de todos los salones - Mes
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/mes/pdf?mes={mes}&anio={anio}
	 */
	descargarPdfTodosSalonesMes(mes?: number, anio?: number): Observable<Blob> {
		const params: Record<string, string> = {};

		if (mes !== undefined) {
			params['mes'] = mes.toString();
		}
		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http.get(`${this.apiUrl}/director/reporte/todos-salones/mes/pdf`, {
			params,
			responseType: 'blob',
		});
	}

	/**
	 * Descargar PDF consolidado de todos los salones - Anio
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/anio/pdf?anio={anio}
	 */
	descargarPdfTodosSalonesAnio(anio?: number): Observable<Blob> {
		const params: Record<string, string> = {};

		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http.get(`${this.apiUrl}/director/reporte/todos-salones/anio/pdf`, {
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

	private getEstadisticasVacias(): EstadisticasAsistenciaDia {
		return {
			total: 0,
			temprano: 0,
			aTiempo: 0,
			fueraHora: 0,
			noAsistio: 0,
			justificado: 0,
			pendiente: 0,
		};
	}

	// #endregion
}
