import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { AuditoriaCorreoAsistenciaDto } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditoriaCorreosService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/auditoria-correos-asistencia`;

	// #region Consultas
	/**
	 * `GET /api/sistema/auditoria-correos-asistencia` — lista completa sin paginar
	 * (universo hoy < 500 filas). El interceptor `apiResponseInterceptor` desempaca
	 * `ApiResponse<T>` automáticamente, por eso el tipo retornado es el array directo.
	 */
	listar(): Observable<AuditoriaCorreoAsistenciaDto[]> {
		return this.http.get<AuditoriaCorreoAsistenciaDto[]>(this.apiUrl);
	}
	// #endregion
}
