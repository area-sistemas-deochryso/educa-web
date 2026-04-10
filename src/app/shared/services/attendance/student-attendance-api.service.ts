import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@config/environment';
import { ResumenAsistencia } from '@data/models/attendance.models';

@Injectable({ providedIn: 'root' })
export class StudentAttendanceApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	// #region Consultas (GET)

	/**
	 * Obtener mis asistencias como estudiante
	 * GET /api/ConsultaAsistencia/estudiante/mis-asistencias?mes={mes}&anio={anio}
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

	// #endregion
}
