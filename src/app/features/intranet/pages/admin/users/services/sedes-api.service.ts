// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { SedeSimpleDto } from '../models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class SedesApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/sedes`;

	/**
	 * GET /api/sistema/sedes
	 * Lista sedes activas para el selector del formulario de usuario.
	 */
	listar(): Observable<SedeSimpleDto[]> {
		return this.http.get<SedeSimpleDto[]>(this.apiUrl);
	}
}
// #endregion
