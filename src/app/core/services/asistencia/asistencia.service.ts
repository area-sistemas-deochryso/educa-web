import {
	EstadisticasDia,
	EstudianteAsistencia,
	GradoSeccion,
	HijoApoderado,
	ProfesorSede,
	ResumenAsistencia,
	SalonProfesor,
} from './asistencia.models';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({
	providedIn: 'root',
})
export class AsistenciaService {
	// * Attendance API service for estudiante, apoderado, profesor, director flows.
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;
	private http = inject(HttpClient);

	/**
	 * Formatea una fecha a YYYY-MM-DD usando zona horaria local (evita desfase UTC)
	 */
	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Estudiante: Obtener mis asistencias
	 * GET /api/ConsultaAsistencia/estudiante/mis-asistencias?mes={mes}&año={año}
	 */
	getMisAsistencias(mes?: number, anio?: number): Observable<ResumenAsistencia | null> {
		const params: Record<string, string> = {};

		if (mes !== undefined) {
			params['mes'] = mes.toString();
		}
		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http
			.get<ResumenAsistencia>(`${this.apiUrl}/estudiante/mis-asistencias`, { params })
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Apoderado: Obtener lista de hijos
	 * GET /api/ConsultaAsistencia/apoderado/hijos
	 */
	getHijos(): Observable<HijoApoderado[]> {
		return this.http
			.get<HijoApoderado[]>(`${this.apiUrl}/apoderado/hijos`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Apoderado: Obtener asistencia de un hijo
	 * GET /api/ConsultaAsistencia/apoderado/hijo/{estudianteId}/asistencias?mes={mes}&año={año}
	 */
	getAsistenciaHijo(
		estudianteId: number,
		mes?: number,
		anio?: number,
	): Observable<ResumenAsistencia | null> {
		const params: Record<string, string> = {};

		if (mes !== undefined) {
			params['mes'] = mes.toString();
		}
		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http
			.get<ResumenAsistencia>(`${this.apiUrl}/apoderado/hijo/${estudianteId}/asistencias`, {
				params,
			})
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Profesor: Obtener salones asignados con estudiantes
	 * GET /api/ConsultaAsistencia/profesor/salones
	 */
	getSalonesProfesor(): Observable<SalonProfesor[]> {
		return this.http
			.get<SalonProfesor[]>(`${this.apiUrl}/profesor/salones`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Profesor: Obtener asistencias de estudiantes por grado/sección
	 * GET /api/ConsultaAsistencia/profesor/grado?grado={grado}&seccion={seccion}&mes={mes}&anio={anio}
	 */
	getAsistenciasGrado(
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
			.get<EstudianteAsistencia[]>(`${this.apiUrl}/profesor/grado`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Profesor: Obtener asistencia de un grado/sección en un día específico
	 * GET /api/ConsultaAsistencia/profesor/asistencia-dia?grado={grado}&seccion={seccion}&fecha={fecha}
	 */
	getAsistenciaDia(
		grado: string,
		seccion: string,
		fecha: Date,
	): Observable<EstudianteAsistencia[]> {
		const params: Record<string, string> = {
			grado,
			seccion,
			fecha: this.formatDateLocal(fecha),
		};

		return this.http
			.get<EstudianteAsistencia[]>(`${this.apiUrl}/profesor/asistencia-dia`, { params })
			.pipe(catchError(() => of([])));
	}

	// === DIRECTOR ===

	/**
	 * Director: Obtener reporte de asistencia con filtros opcionales
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
	 * Director: Obtener estadísticas del día
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
	 * Director: Obtener asistencia de un grado/sección en un día específico
	 * GET /api/ConsultaAsistencia/director/asistencia-dia?grado={grado}&seccion={seccion}&fecha={fecha}
	 */
	getAsistenciaDiaDirector(
		grado: string,
		seccion: string,
		fecha: Date,
	): Observable<EstudianteAsistencia[]> {
		const params: Record<string, string> = {
			grado,
			seccion,
			fecha: this.formatDateLocal(fecha),
		};

		return this.http
			.get<EstudianteAsistencia[]>(`${this.apiUrl}/director/asistencia-dia`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Director: Descargar PDF de asistencia del día
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
	 * Director: Descargar PDF consolidado de todos los salones - Día
	 *
	 * Genera un reporte PDF con asistencias de todos los grados/secciones de la sede
	 * en un día específico. Muestra para cada salón:
	 * - Total de estudiantes
	 * - Quiénes asistieron (puntuales y tardanzas)
	 * - Quiénes no asistieron
	 * - Porcentaje de asistencia
	 *
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/dia/pdf?fecha={fecha}
	 *
	 * @param fecha - Fecha del reporte (opcional, por defecto: hoy)
	 * @returns Observable<Blob> - PDF listo para descargar/visualizar
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
	 * Director: Descargar PDF consolidado de todos los salones - Semana
	 *
	 * Genera un reporte PDF con estadísticas de asistencia de todos los salones
	 * en una semana (7 días). Muestra tabla resumen con:
	 * - Grado y sección
	 * - Total de estudiantes
	 * - Total de asistencias registradas en la semana
	 * - Porcentaje de asistencia (basado en 5 días laborales)
	 *
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/semana/pdf?fechaInicio={fechaInicio}
	 *
	 * @param fechaInicio - Fecha de inicio de la semana (opcional, por defecto: inicio de semana actual)
	 * @returns Observable<Blob> - PDF listo para descargar/visualizar
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
	 * Director: Descargar PDF consolidado de todos los salones - Mes
	 *
	 * Genera un reporte PDF con estadísticas de asistencia de todos los salones
	 * en un mes completo. Muestra tabla resumen con:
	 * - Grado y sección
	 * - Total de estudiantes
	 * - Total de asistencias registradas en el mes
	 * - Porcentaje de asistencia (basado en ~22 días hábiles)
	 *
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/mes/pdf?mes={mes}&anio={anio}
	 *
	 * @param mes - Mes del reporte (1-12, opcional, por defecto: mes actual)
	 * @param anio - Año del reporte (opcional, por defecto: año actual)
	 * @returns Observable<Blob> - PDF listo para descargar/visualizar
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
	 * Director: Descargar PDF consolidado de todos los salones - Año
	 *
	 * Genera un reporte PDF con estadísticas de asistencia de todos los salones
	 * en un año escolar completo. Muestra tabla resumen con:
	 * - Grado y sección
	 * - Total de estudiantes
	 * - Total de asistencias registradas en el año
	 * - Porcentaje de asistencia (basado en ~200 días hábiles)
	 *
	 * GET /api/ConsultaAsistencia/director/reporte/todos-salones/anio/pdf?anio={anio}
	 *
	 * @param anio - Año del reporte (opcional, por defecto: año actual)
	 * @returns Observable<Blob> - PDF listo para descargar/visualizar
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

	/**
	 * Director: Obtener salones de la sede
	 * GET /api/ConsultaAsistencia/director/salones
	 */
	getSalonesDirector(): Observable<SalonProfesor[]> {
		return this.http
			.get<SalonProfesor[]>(`${this.apiUrl}/director/salones`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Director: Obtener profesores de la sede
	 * GET /api/ConsultaAsistencia/director/profesores
	 */
	getProfesoresDirector(): Observable<ProfesorSede[]> {
		return this.http
			.get<ProfesorSede[]>(`${this.apiUrl}/director/profesores`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Director: Obtener asistencias de estudiantes por grado/sección
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
	 * Director: Obtener grados/secciones disponibles de la sede
	 * Usa el endpoint de salones y extrae grados/secciones únicos
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

	// === JUSTIFICACIONES ===

	/**
	 * Justificar o quitar justificación de asistencia de un estudiante.
	 * Crea o actualiza un registro de asistencia con observación de justificación.
	 *
	 * POST /api/ConsultaAsistencia/justificar
	 *
	 * @param estudianteId - ID del estudiante
	 * @param fecha - Fecha de la asistencia a justificar
	 * @param observacion - Motivo/justificación de la falta
	 * @param quitar - Si es true, quita la justificación
	 * @returns Observable con el resultado de la operación
	 */
	justificarAsistencia(
		estudianteId: number,
		fecha: Date,
		observacion: string,
		quitar: boolean = false,
	): Observable<{ success: boolean; message: string }> {
		const body = {
			estudianteId,
			fecha: this.formatDateLocal(fecha),
			observacion,
			quitar,
		};

		return this.http
			.post<{ success: boolean; message: string }>(`${this.apiUrl}/justificar`, body)
			.pipe(
				catchError(() =>
					of({ success: false, message: 'Error al guardar la justificación' }),
				),
			);
	}
}
