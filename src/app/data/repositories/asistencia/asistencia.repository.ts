import { BaseRepository, QueryParams } from '../base/base.repository';
import {
	EstudianteAsistencia,
	HijoApoderado,
	ResumenAsistencia,
	SalonProfesor,
} from '@core/services/asistencia';
import { Observable, catchError, of } from 'rxjs';

import { Injectable } from '@angular/core';
import { logger } from '@core/helpers';

export interface AsistenciaQueryParams extends QueryParams {
	mes?: number;
	anio?: number;
}

export interface AsistenciaGradoParams extends AsistenciaQueryParams {
	grado: string;
	seccion: string;
}

@Injectable({
	providedIn: 'root',
})
export class AsistenciaRepository extends BaseRepository<ResumenAsistencia> {
	protected endpoint = '/api/ConsultaAsistencia';
	protected entityName = 'Asistencia';

	/**
	 * Estudiante: Obtener mis asistencias
	 */
	getMisAsistencias(params?: AsistenciaQueryParams): Observable<ResumenAsistencia | null> {
		return this.httpService['get']<ResumenAsistencia>(
			`${this.endpoint}/estudiante/mis-asistencias`,
			params
				? { params: this.httpService['buildParams'](params as Record<string, unknown>) }
				: undefined,
		).pipe(
			catchError((error) => {
				logger.error('[AsistenciaRepository] getMisAsistencias error:', error);
				return of(null);
			}),
		);
	}

	/**
	 * Apoderado: Obtener lista de hijos
	 */
	getHijos(): Observable<HijoApoderado[]> {
		return this.httpService['get']<HijoApoderado[]>(`${this.endpoint}/apoderado/hijos`).pipe(
			catchError((error) => {
				logger.error('[AsistenciaRepository] getHijos error:', error);
				return of([]);
			}),
		);
	}

	/**
	 * Apoderado: Obtener asistencia de un hijo
	 */
	getAsistenciaHijo(
		estudianteId: number,
		params?: AsistenciaQueryParams,
	): Observable<ResumenAsistencia | null> {
		return this.httpService['get']<ResumenAsistencia>(
			`${this.endpoint}/apoderado/hijo/${estudianteId}/asistencias`,
			params
				? { params: this.httpService['buildParams'](params as Record<string, unknown>) }
				: undefined,
		).pipe(
			catchError((error) => {
				logger.error('[AsistenciaRepository] getAsistenciaHijo error:', error);
				return of(null);
			}),
		);
	}

	/**
	 * Profesor: Obtener salones asignados
	 */
	getSalonesProfesor(): Observable<SalonProfesor[]> {
		return this.httpService['get']<SalonProfesor[]>(`${this.endpoint}/profesor/salones`).pipe(
			catchError((error) => {
				logger.error('[AsistenciaRepository] getSalonesProfesor error:', error);
				return of([]);
			}),
		);
	}

	/**
	 * Profesor: Obtener asistencias por grado/seccion
	 */
	getAsistenciasGrado(params: AsistenciaGradoParams): Observable<EstudianteAsistencia[]> {
		return this.httpService['get']<EstudianteAsistencia[]>(`${this.endpoint}/profesor/grado`, {
			params: this.httpService['buildParams'](params as Record<string, unknown>),
		}).pipe(
			catchError((error) => {
				logger.error('[AsistenciaRepository] getAsistenciasGrado error:', error);
				return of([]);
			}),
		);
	}
}
