import { Injectable } from '@angular/core';

/**
 * Plan 41 F6 (ADR-0009) — id de correlación de la sesión del navegador.
 *
 * A diferencia del `X-Request-Id` (uno por request HTTP, INV-CORR01), este id
 * vive lo que la pestaña: lo comparten los breadcrumbs, las conexiones de los
 * hubs SignalR y las entradas del WAL. Es un GUID aleatorio, sin información
 * personal; charset `[A-Za-z0-9_-]` y máx. 50, que es lo que el BE acepta en
 * el query `correlationId` de la conexión.
 */
@Injectable({ providedIn: 'root' })
export class SessionCorrelationService {
	readonly id = SessionCorrelationService.newId();

	/** Devuelve la URL del hub con el id de la sesión en el query `correlationId`. */
	hubUrl(path: string): string {
		return `${path}?correlationId=${this.id}`;
	}

	private static newId(): string {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
		return `s_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
	}
}
