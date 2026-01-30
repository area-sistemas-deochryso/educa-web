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
						result.push({ grado: s.grado, seccion: s.seccion });
					}
				});

				return result;
			}),
		);
	}
}
