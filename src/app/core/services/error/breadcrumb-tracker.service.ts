import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';

import { environment } from '@config/environment';
import {
	isReportableHttpStatus,
	normalizeRoute,
	sanitizeErrorClass,
	sanitizeMethod,
} from './breadcrumb-tracker.helpers';
import {
	BREADCRUMB_BUFFER_SIZE,
	BREADCRUMB_MAX_SENDS_PER_MINUTE,
	BREADCRUMB_SEND_WINDOW_MS,
	SKIP_BREADCRUMBS,
	type BreadcrumbEvent,
	type BreadcrumbIngestPayload,
} from './breadcrumb-tracker.models';

/**
 * Plan 41 F4b (ADR-0008) — buffer circular en memoria de los últimos pasos del
 * cliente (navegaciones, HTTP saliente, errores), que se envía al BE **solo ante
 * un error**. Guarda forma, nunca contenido: rutas normalizadas, sin query, cuerpos
 * ni mensajes. Convive con `ActivityTrackerService` (mecanismo viejo, intacto).
 *
 * Anti-bucle (patrón brief 847): el envío es de un solo intento, no reintenta,
 * viaja marcado con `SKIP_BREADCRUMBS` (los interceptores lo ignoran) y se
 * deduplica por correlationId con tope de envíos por minuto.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbTrackerService {
	private readonly http = inject(HttpClient);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	private static readonly ENDPOINT = `${environment.apiUrl}/api/sistema/breadcrumbs`;

	private readonly buffer: BreadcrumbEvent[] = [];
	private readonly sessionId = BreadcrumbTrackerService.newId();
	private readonly sentCorrelationIds = new Set<string>();
	private sendTimestamps: number[] = [];
	private lastErrorRequestId: string | null = null;

	constructor() {
		this.trackNavigation();
	}

	// #region API pública

	/** Registra una request saliente ya resuelta. Ignora el endpoint de ingesta. */
	trackHttp(method: string, url: string, status: number, requestId?: string): void {
		const ruta = normalizeRoute(url);
		if (ruta === BreadcrumbTrackerService.ingestRoute()) return;
		// El request que acaba de fallar ya se registró al reportar el error.
		if (requestId && requestId === this.lastErrorRequestId) return;

		this.push({ tipo: 'http', at: Date.now(), ruta, metodo: sanitizeMethod(method), statusCode: status });
	}

	/** Error HTTP: si es 5xx o 4xx inesperado, registra la request fallida y envía el buffer. */
	onHttpError(status: number, url: string, method: string | undefined, correlationId: string | undefined): void {
		if (!correlationId || !isReportableHttpStatus(status)) return;
		const ruta = normalizeRoute(url);
		if (ruta === BreadcrumbTrackerService.ingestRoute()) return;

		this.lastErrorRequestId = correlationId;
		this.push({ tipo: 'http', at: Date.now(), ruta, metodo: sanitizeMethod(method), statusCode: status });
		this.flush(correlationId);
	}

	/** Excepción no capturada: registra la clase del error y envía el buffer. */
	onClientError(errorName: string | undefined, correlationId: string): void {
		this.push({
			tipo: 'error',
			at: Date.now(),
			ruta: normalizeRoute(this.router.url),
			errorClass: sanitizeErrorClass(errorName),
		});
		this.flush(correlationId);
	}

	/** Reinicia buffer y control de envíos (logout: el buffer es de la sesión del usuario). */
	reset(): void {
		this.buffer.length = 0;
		this.sentCorrelationIds.clear();
		this.sendTimestamps = [];
		this.lastErrorRequestId = null;
	}

	// #endregion

	// #region Buffer

	private trackNavigation(): void {
		const initial = this.router.url;
		if (initial && initial !== '/') {
			this.push({ tipo: 'navigation', at: Date.now(), ruta: normalizeRoute(initial) });
		}

		this.router.events
			.pipe(
				filter((event): event is NavigationEnd => event instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				this.push({ tipo: 'navigation', at: Date.now(), ruta: normalizeRoute(event.urlAfterRedirects) });
			});
	}

	private push(event: BreadcrumbEvent): void {
		if (this.buffer.length >= BREADCRUMB_BUFFER_SIZE) this.buffer.shift();
		this.buffer.push(event);
	}

	// #endregion

	// #region Envío

	private flush(correlationId: string): void {
		if (this.sentCorrelationIds.has(correlationId) || !this.consumeSendQuota()) return;
		this.sentCorrelationIds.add(correlationId);

		const now = Date.now();
		const payload: BreadcrumbIngestPayload = {
			correlationId,
			sessionId: this.sessionId,
			events: this.buffer.map(({ at, ...rest }) => ({ ...rest, offsetMs: Math.max(0, now - at) })),
		};

		// Un solo intento: sin reintento, sin outbox. Si falla se pierde el contexto, no se repite.
		const options = {
			headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }),
			context: new HttpContext().set(SKIP_BREADCRUMBS, true),
		};
		firstValueFrom(this.http.post(BreadcrumbTrackerService.ENDPOINT, payload, options)).catch(() => {
			// Best-effort: ante falla (429, 5xx, red) no se reintenta.
		});
	}

	private consumeSendQuota(): boolean {
		const now = Date.now();
		this.sendTimestamps = this.sendTimestamps.filter((t) => now - t < BREADCRUMB_SEND_WINDOW_MS);
		if (this.sendTimestamps.length >= BREADCRUMB_MAX_SENDS_PER_MINUTE) return false;
		this.sendTimestamps.push(now);
		return true;
	}

	// #endregion

	// #region Helpers

	private static ingestRoute(): string {
		return normalizeRoute(BreadcrumbTrackerService.ENDPOINT);
	}

	private static newId(): string {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
		return `s_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
	}

	// #endregion
}
