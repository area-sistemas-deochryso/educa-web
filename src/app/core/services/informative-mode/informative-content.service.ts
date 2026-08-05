// #region Imports
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

// #endregion
// #region Implementation
/**
 * Gateway HTTP del contenido del modo informativo (plan xrepo-96, F4).
 * El response interceptor ya desempaca `ApiResponse<T>`, por eso tipamos `post` con T directo.
 */
@Injectable({ providedIn: 'root' })
export class InformativeContentService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/explicaciones`;

	/**
	 * Resuelve el texto explicativo (default+override por rol, ya calculado por el backend)
	 * para las anclas presentes en la vista actual. Anclas sin fila cargada simplemente no
	 * aparecen en la respuesta — el caller decide el fallback genérico.
	 */
	resolver(anclas: string[]): Observable<Record<string, string>> {
		return this.http.post<Record<string, string>>(`${this.apiUrl}/resolver`, { anclas });
	}
}
// #endregion
