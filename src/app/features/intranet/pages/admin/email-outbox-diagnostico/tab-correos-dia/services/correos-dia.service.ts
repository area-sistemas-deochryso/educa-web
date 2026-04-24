import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { DiagnosticoCorreosDiaDto } from '../models/correos-dia.models';

@Injectable({ providedIn: 'root' })
export class CorreosDiaService {
	// #region Dependencias
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/asistencia`;
	// #endregion

	// #region Consultas (GET)
	// * Interceptor global desempaqueta ApiResponse<T> → el tipo es T directo.
	obtenerDiagnostico(
		fecha?: string,
		sedeId?: number | null,
	): Observable<DiagnosticoCorreosDiaDto> {
		let params = new HttpParams();
		if (fecha) params = params.set('fecha', fecha);
		if (sedeId != null) params = params.set('sedeId', String(sedeId));
		return this.http.get<DiagnosticoCorreosDiaDto>(
			`${this.baseUrl}/diagnostico-correos-dia`,
			{ params },
		);
	}
	// #endregion
}
