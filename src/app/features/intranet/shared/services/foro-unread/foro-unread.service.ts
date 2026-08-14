// #region Imports
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@config/environment';
import type { ConversacionListDto } from '@data/models';
// #endregion

const FORO_PREFIX = 'Foro:';

/**
 * Conteo global de mensajes no leídos en conversaciones de Foro, para el badge del
 * menú de navegación (brief 542, P98 F4). Servicio propio en `shared/` (en vez de
 * reusar `SalonMensajeriaFacade`, que vive en `pages/cross-role/mensajeria`) porque
 * el layout no puede depender de un feature de página — mismo endpoint, sin
 * scoping por `horarioId`: el backend ya devuelve todas las conversaciones del
 * usuario cuando se omite.
 */
@Injectable({ providedIn: 'root' })
export class ForoUnreadService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/conversaciones`;

	private readonly _total = signal(0);
	readonly total = this._total.asReadonly();

	refresh(): void {
		this.http.get<ConversacionListDto[]>(`${this.baseUrl}/listar`).subscribe({
			next: (conversaciones) => {
				const total = conversaciones
					.filter((c) => c.asunto.startsWith(FORO_PREFIX))
					.reduce((acc, c) => acc + c.mensajesNoLeidos, 0);
				this._total.set(total);
			},
			error: () => {
				// Best-effort: un badge que no carga no debe romper la navegación.
				this._total.set(0);
			},
		});
	}
}
