import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '@config/environment';
import { PaginatedResponse } from '@shared/models';
import {
	AsistenciaDiaConEstadisticas,
	EstadisticasAsistenciaDia,
	EstadisticasDia,
	EstudianteAsistencia,
	GradoSeccion,
	ProfesorSede,
	SalonProfesor,
} from '@data/models/attendance.models';

@Injectable({ providedIn: 'root' })
export class DirectorAttendanceApiService {
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

	// #region Descargas PDF / Excel
	// Cada método público delega a `downloadReport` con el sufijo de formato.
	// Para agregar un formato nuevo (csv, etc.), duplicar el método con '/csv'.

	descargarPdfAsistenciaDia(grado: string, seccion: string, fecha?: Date): Observable<Blob> {
		return this.downloadReport('asistencia-dia', 'pdf', this.diaParams(grado, seccion, fecha));
	}

	descargarExcelAsistenciaDia(grado: string, seccion: string, fecha?: Date): Observable<Blob> {
		return this.downloadReport('asistencia-dia', 'excel', this.diaParams(grado, seccion, fecha));
	}

	descargarPdfAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): Observable<Blob> {
		return this.downloadReport('asistencia-mes', 'pdf', this.mesParams(grado, seccion, mes, anio));
	}

	descargarExcelAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): Observable<Blob> {
		return this.downloadReport('asistencia-mes', 'excel', this.mesParams(grado, seccion, mes, anio));
	}

	descargarPdfAsistenciaPeriodo(
		grado: string, seccion: string, mesInicio: number, anioInicio: number, mesFin: number, anioFin: number,
	): Observable<Blob> {
		return this.downloadReport('asistencia-periodo', 'pdf',
			this.periodoParams(grado, seccion, mesInicio, anioInicio, mesFin, anioFin));
	}

	descargarExcelAsistenciaPeriodo(
		grado: string, seccion: string, mesInicio: number, anioInicio: number, mesFin: number, anioFin: number,
	): Observable<Blob> {
		return this.downloadReport('asistencia-periodo', 'excel',
			this.periodoParams(grado, seccion, mesInicio, anioInicio, mesFin, anioFin));
	}

	descargarPdfTodosSalonesDia(fecha?: Date): Observable<Blob> {
		return this.downloadConsolidado('dia', 'pdf', this.optionalFechaParam('fecha', fecha));
	}

	descargarExcelTodosSalonesDia(fecha?: Date): Observable<Blob> {
		return this.downloadConsolidado('dia', 'excel', this.optionalFechaParam('fecha', fecha));
	}

	descargarPdfTodosSalonesSemana(fechaInicio?: Date): Observable<Blob> {
		return this.downloadConsolidado('semana', 'pdf', this.optionalFechaParam('fechaInicio', fechaInicio));
	}

	descargarExcelTodosSalonesSemana(fechaInicio?: Date): Observable<Blob> {
		return this.downloadConsolidado('semana', 'excel', this.optionalFechaParam('fechaInicio', fechaInicio));
	}

	descargarPdfTodosSalonesMes(mes?: number, anio?: number): Observable<Blob> {
		return this.downloadConsolidado('mes', 'pdf', this.mesAnioParams(mes, anio));
	}

	descargarExcelTodosSalonesMes(mes?: number, anio?: number): Observable<Blob> {
		return this.downloadConsolidado('mes', 'excel', this.mesAnioParams(mes, anio));
	}

	descargarPdfTodosSalonesAnio(anio?: number, periodo?: string): Observable<Blob> {
		return this.downloadConsolidado('anio', 'pdf', this.anioParams(anio, periodo));
	}

	descargarExcelTodosSalonesAnio(anio?: number, periodo?: string): Observable<Blob> {
		return this.downloadConsolidado('anio', 'excel', this.anioParams(anio, periodo));
	}

	private downloadReport(
		endpoint: 'asistencia-dia' | 'asistencia-mes' | 'asistencia-periodo',
		formato: 'pdf' | 'excel',
		params: Record<string, string>,
	): Observable<Blob> {
		return this.http.get(`${this.apiUrl}/director/${endpoint}/${formato}`, {
			params,
			responseType: 'blob',
		});
	}

	private downloadConsolidado(
		rango: 'dia' | 'semana' | 'mes' | 'anio',
		formato: 'pdf' | 'excel',
		params: Record<string, string>,
	): Observable<Blob> {
		return this.http.get(`${this.apiUrl}/director/reporte/todos-salones/${rango}/${formato}`, {
			params,
			responseType: 'blob',
		});
	}

	private diaParams(grado: string, seccion: string, fecha?: Date): Record<string, string> {
		const params: Record<string, string> = { grado, seccion };
		if (fecha) params['fecha'] = this.formatDateLocal(fecha);
		return params;
	}

	private mesParams(grado: string, seccion: string, mes: number, anio: number): Record<string, string> {
		return { grado, seccion, mes: mes.toString(), anio: anio.toString() };
	}

	private periodoParams(
		grado: string, seccion: string, mesInicio: number, anioInicio: number, mesFin: number, anioFin: number,
	): Record<string, string> {
		return {
			grado, seccion,
			mesInicio: mesInicio.toString(), anioInicio: anioInicio.toString(),
			mesFin: mesFin.toString(), anioFin: anioFin.toString(),
		};
	}

	private optionalFechaParam(key: string, fecha?: Date): Record<string, string> {
		const params: Record<string, string> = {};
		if (fecha) params[key] = this.formatDateLocal(fecha);
		return params;
	}

	private mesAnioParams(mes?: number, anio?: number): Record<string, string> {
		const params: Record<string, string> = {};
		if (mes !== undefined) params['mes'] = mes.toString();
		if (anio !== undefined) params['anio'] = anio.toString();
		return params;
	}

	private anioParams(anio?: number, periodo?: string): Record<string, string> {
		const params: Record<string, string> = {};
		if (anio !== undefined) params['anio'] = anio.toString();
		if (periodo) params['periodo'] = periodo;
		return params;
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
			tardanza: 0,
			asistio: 0,
			falta: 0,
			justificado: 0,
			pendiente: 0,
		};
	}

	// #endregion
}
