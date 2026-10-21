// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@config/environment';
import type { CapabilityAuth, UsuarioBusquedaResultado } from '../permissions/permisos.models';

import type { ViewAsRol } from './view-as-context.model';
// #endregion

// #region Implementation
/**
 * Lectura de sujetos para "ver como" (P115 F1/F3). Gateada en el BE solo por la capability de
 * impersonación: quien puede ver como otro usuario no necesita la capability de gestionar permisos
 * de usuarios para elegir a quién ver ni para conocer sus capabilities.
 */
@Injectable({ providedIn: 'root' })
export class ViewAsSujetosService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/view-as/sujetos`;

	buscar(
		rol: ViewAsRol,
		termino?: string,
		salonId?: number,
		cursoId?: number,
	): Observable<UsuarioBusquedaResultado> {
		const params: Record<string, string> = { rol: rol.toLowerCase() };
		if (termino) params['termino'] = termino;
		if (salonId) params['salonId'] = String(salonId);
		if (cursoId) params['cursoId'] = String(cursoId);

		return this.http.get<UsuarioBusquedaResultado>(this.baseUrl, { params });
	}

	/**
	 * Capabilities efectivas del sujeto (mismo formato que las del usuario logueado). A diferencia de
	 * `PermissionsService.getMyCapabilities()` NO traga errores: quien llama decide el fallback.
	 */
	obtenerCapabilities(rol: ViewAsRol, entityId: number): Observable<CapabilityAuth[]> {
		return this.http
			.get<CapabilityAuth[] | null>(`${this.baseUrl}/${rol.toLowerCase()}/${entityId}/capabilities`)
			.pipe(map((caps) => (Array.isArray(caps) ? caps : [])));
	}
}
// #endregion
