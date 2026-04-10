import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@config/environment';
import { HijoApoderado, ResumenAsistencia } from '@data/models/attendance.models';

@Injectable({ providedIn: 'root' })
export class GuardianAttendanceApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	// #region Consultas (GET)

	/**
	 * Obtener lista de hijos del apoderado
	 * GET /api/ConsultaAsistencia/apoderado/hijos
	 */
	getHijos(): Observable<HijoApoderado[]> {
		return this.http
			.get<HijoApoderado[]>(`${this.apiUrl}/apoderado/hijos`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Obtener asistencia de un hijo
	 * GET /api/ConsultaAsistencia/apoderado/hijo/{estudianteId}/asistencias?mes={mes}&anio={anio}
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

	// #endregion
}
