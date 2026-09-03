// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { ApiResponse } from '@shared/models';
import { AttendanceSimulationTriggerDto } from '../models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class AttendanceSimulationApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/asistencia/registrar`;

	/**
	 * POST /api/asistencia/registrar — reexpone el registro manual de asistencia
	 * (mismo endpoint que usa el flujo de "lector caído") para simular una marcación
	 * CrossChex sin hardware real. El backend decide entrada/salida según la
	 * marcación del día ya existente.
	 */
	trigger(dto: AttendanceSimulationTriggerDto): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(this.apiUrl, dto);
	}
}
// #endregion
