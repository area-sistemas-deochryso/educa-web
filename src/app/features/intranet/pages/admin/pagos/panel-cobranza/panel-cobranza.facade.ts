import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { PagoCorte, PanelCobranza } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';

/**
 * Punto de entrada del panel hacia la API de pagos (los componentes no importan `*-api.service` directo).
 * Sin reintentos: 4xx/429 no se reintentan (`contracts/rate-limiting.md`); «Reintentar» es manual.
 */
@Injectable({ providedIn: 'root' })
export class PanelCobranzaFacade {
	private readonly api = inject(PagosApiService);

	panel(fecha?: string | null): Observable<PanelCobranza> {
		return this.api.panel(fecha);
	}

	cortes(anio: number): Observable<PagoCorte[]> {
		return this.api.cortes(anio);
	}

	guardarCorte(corte: PagoCorte): Observable<PagoCorte> {
		return this.api.guardarCorte(corte);
	}
}
