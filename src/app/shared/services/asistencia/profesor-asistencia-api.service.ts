import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@config/environment';
import {
	AsistenciaDiaConEstadisticas,
	EstadisticasAsistenciaDia,
	EstudianteAsistencia,
	SalonProfesor,
} from '@data/models/asistencia.models';

@Injectable({ providedIn: 'root' })
export class ProfesorAsistenciaApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	// #region Consultas (GET)

	/**
	 * Obtener salones asignados con estudiantes
	 * GET /api/ConsultaAsistencia/profesor/salones
	 */
	getSalonesProfesor(): Observable<SalonProfesor[]> {
		return this.http
			.get<SalonProfesor[]>(`${this.apiUrl}/profesor/salones`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener salones donde tiene horarios activos
	 * GET /api/ConsultaAsistencia/profesor/salones-horario
	 */
	getSalonesProfesorPorHorario(): Observable<SalonProfesor[]> {
		return this.http
			.get<SalonProfesor[]>(`${this.apiUrl}/profesor/salones-horario`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener asistencias de estudiantes por grado/seccion
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
	 * Obtener asistencia de un grado/seccion en un dia especifico con estadisticas
	 * GET /api/ConsultaAsistencia/profesor/asistencia-dia?grado={grado}&seccion={seccion}&fecha={fecha}
	 */
	getAsistenciaDia(
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
			.get<AsistenciaDiaConEstadisticas>(`${this.apiUrl}/profesor/asistencia-dia`, { params })
			.pipe(
				catchError(() =>
					of({ estudiantes: [], estadisticas: this.getEstadisticasVacias() }),
				),
			);
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
			noAsistio: 0,
			justificado: 0,
			pendiente: 0,
		};
	}

	// #endregion
}
