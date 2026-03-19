// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { CampusCompletoDto } from '@features/intranet/pages/admin/campus/models';
import { MiHorarioHoyItem } from '../models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class CampusNavigationApiService {
	private readonly http = inject(HttpClient);
	private readonly horarioUrl = `${environment.apiUrl}/api/horario`;
	private readonly campusUrl = `${environment.apiUrl}/api/campus`;

	/**
	 * GET /api/horario/mi-horario-hoy
	 * Retorna el horario del día para el usuario autenticado (Profesor o Estudiante)
	 */
	getMiHorarioHoy(): Observable<MiHorarioHoyItem[]> {
		return this.http.get<MiHorarioHoyItem[]>(`${this.horarioUrl}/mi-horario-hoy`);
	}

	/**
	 * GET /api/campus/completo
	 * Retorna el campus completo con pisos, nodos, aristas, bloqueos y conexiones verticales
	 */
	getCampusCompleto(): Observable<CampusCompletoDto> {
		return this.http.get<CampusCompletoDto>(`${this.campusUrl}/completo`);
	}
}
// #endregion
