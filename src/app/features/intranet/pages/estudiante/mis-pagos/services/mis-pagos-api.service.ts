import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import type { MisPagos } from '@data/models';

/**
 * La pantalla explica cada error con su propio texto; el toast global repetiría el mensaje crudo del servidor.
 * Los 5xx y los status 0 se siguen reportando.
 */
const SIN_TOAST = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }) };

/**
 * Cliente de `/api/mis-pagos` (solo lectura). El estudiante sale del token: no se manda id.
 * Pagos no se cachea en el SW (INV-WAL-RES11): cada GET va a la red.
 */
@Injectable({ providedIn: 'root' })
export class MisPagosApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/mis-pagos`;

	estadoCuenta(): Observable<MisPagos> {
		return this.http.get<MisPagos>(`${this.apiUrl}/estado-cuenta`, SIN_TOAST);
	}
}
