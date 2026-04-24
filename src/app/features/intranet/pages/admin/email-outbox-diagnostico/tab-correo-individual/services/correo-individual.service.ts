import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { EmailDiagnosticoDto } from '../models/correo-individual.models';

@Injectable({ providedIn: 'root' })
export class CorreoIndividualService {
	// #region Dependencias
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/email-outbox`;
	// #endregion

	// #region Consultas (GET)
	// * Interceptor global desempaqueta ApiResponse<T> → el tipo es T directo.
	obtenerDiagnostico(correo: string): Observable<EmailDiagnosticoDto> {
		const params = new HttpParams().set('correo', correo);
		return this.http.get<EmailDiagnosticoDto>(`${this.baseUrl}/diagnostico`, {
			params,
		});
	}
	// #endregion
}
