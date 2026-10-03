import { Injectable, inject } from '@angular/core';
import { CalificacionesFacade } from '../services/calificaciones.facade';

/**
 * Carga perezosa de las calificaciones del hub del profesor.
 *
 * El shell es dueño del ciclo de vida (`reset` al cambiar de franja y al salir
 * del hub); las pestañas que necesitan calificaciones (Calificaciones e
 * Información) piden `ensure(contenidoId)` y no cargan dos veces el mismo
 * contenido. Así abrir solo Contenido no paga las requests de calificaciones.
 */
@Injectable({ providedIn: 'root' })
export class CursoHubCalificacionesLoader {
	private readonly calFacade = inject(CalificacionesFacade);
	private loadedFor: number | null = null;

	/** Carga las calificaciones del contenido si todavía no se cargaron para ese id. */
	ensure(contenidoId: number): void {
		if (this.loadedFor === contenidoId) return;
		this.loadedFor = contenidoId;
		this.calFacade.loadCalificacionesForHub(contenidoId);
	}

	/** Refresco manual del contenido ya cargado. */
	refresh(contenidoId: number): void {
		this.loadedFor = contenidoId;
		this.calFacade.loadCalificacionesForHub(contenidoId);
	}

	/** Cancela la carga en vuelo y limpia el store. */
	reset(): void {
		this.loadedFor = null;
		this.calFacade.resetForHub();
	}
}
