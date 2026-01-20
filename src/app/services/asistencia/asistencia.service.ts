import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@app/environment';

import { ResumenAsistencia, HijoApoderado } from './asistencia.models';

@Injectable({
	providedIn: 'root',
})
export class AsistenciaService {
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	constructor(private http: HttpClient) {}

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
	getAsistenciaHijo(estudianteId: number, mes?: number, anio?: number): Observable<ResumenAsistencia | null> {
		const params: Record<string, string> = {};

		if (mes !== undefined) {
			params['mes'] = mes.toString();
		}
		if (anio !== undefined) {
			params['anio'] = anio.toString();
		}

		return this.http
			.get<ResumenAsistencia>(`${this.apiUrl}/apoderado/hijo/${estudianteId}/asistencias`, { params })
			.pipe(catchError(() => of(null)));
	}
}
