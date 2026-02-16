// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { MiHorarioHoyItem } from '../models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class CampusNavigationApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/horario`;

	/**
	 * GET /api/horario/mi-horario-hoy
	 * Retorna el horario del día para el usuario autenticado (Profesor o Estudiante)
	 */
	getMiHorarioHoy(): Observable<MiHorarioHoyItem[]> {
		return this.http.get<MiHorarioHoyItem[]>(`${this.apiUrl}/mi-horario-hoy`);
	}
}
// #endregion
