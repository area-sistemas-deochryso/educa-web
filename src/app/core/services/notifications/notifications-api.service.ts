import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import { NotificacionActiva } from '@data/models';

/**
 * Gateway service for notification API calls.
 * Pure IO — no state, no UI logic.
 */
@Injectable({
	providedIn: 'root',
})
export class NotificationsApiService {
	// #region Dependencies
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/notificaciones`;
	// #endregion

	// #region Queries (GET)
	/**
	 * Fetch active notifications from the backend.
	 */
	getActivas(): Observable<NotificacionActiva[]> {
		return this.http.get<NotificacionActiva[]>(`${this.apiUrl}/activas`);
	}
	// #endregion
}
