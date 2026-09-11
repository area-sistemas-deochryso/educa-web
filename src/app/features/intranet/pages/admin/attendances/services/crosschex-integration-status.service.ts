import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

/**
 * P10 F3 — estado consolidado de la integración CrossChex, expuesto por
 * `Educa.API` en `GET /api/sistema/integration-status`.
 */
export interface CrossChexIntegrationStatusDto {
	integracion: string;
	ultimoIntentoUtc: string | null;
	ultimoExitoUtc: string | null;
	fallosConsecutivos: number;
	/** `null` si nunca hubo un sync exitoso registrado. */
	minutosSinExito: number | null;
	estado: 'OK' | 'DEGRADADO';
}

@Injectable({ providedIn: 'root' })
export class CrossChexIntegrationStatusService {
	private readonly http = inject(HttpClient);
	private readonly endpoint = `${environment.apiUrl}/api/sistema/integration-status`;
	// Polling silencioso en background — un fallo transitorio de esta llamada
	// no debe interrumpir al usuario con un toast (ver auth-api.service.ts
	// para el mismo patrón con requests de infraestructura).
	private readonly silentHeaders = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });

	getStatus(): Observable<CrossChexIntegrationStatusDto> {
		return this.http.get<CrossChexIntegrationStatusDto>(this.endpoint, {
			headers: this.silentHeaders,
		});
	}
}
