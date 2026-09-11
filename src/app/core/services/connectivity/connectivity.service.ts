// #region Imports
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '@config';
import { logger } from '@core/helpers';
import { CapacitorService } from '@core/services/capacitor';
// #endregion

// #region Types
/**
 * P10 F2 (resiliencia DEP-2/DEP-3): fuente de verdad consolidada de
 * conectividad — reemplaza a `navigator.onLine` crudo como señal única.
 * `offline` cubre tanto "sin red" (DEP-3) como "backend inalcanzable con
 * red presente" (DEP-2, ej. Azure App Service caído).
 */
export type ConnectivityState = 'online' | 'offline';
// #endregion

// #region Constants
const HEALTH_PROBE_PATH = '/api/health';
const HEALTH_PROBE_TIMEOUT_MS = 5_000;
/** Polling activo mientras degradado — DEP-2, 30s según el plan P10. */
const DEGRADED_POLL_INTERVAL_MS = 30_000;
// #endregion

// #region Implementation
/**
 * Servicio de conectividad real. A diferencia de `SwService.isOnline$`
 * (solo `navigator.onLine` + eventos del browser, propenso a falsos
 * positivos — ver plan P10 DEP-3), esta fuente:
 *
 * 1. Escucha los eventos del browser/Capacitor Network como señal rápida.
 * 2. Confirma transiciones a `online` con una prueba real (HEAD a
 *    `/api/health`) antes de despejar el estado degradado.
 * 3. Permite que el interceptor HTTP fuerce `offline` ante N fallos de red
 *    consecutivos, sin esperar al evento del browser (`reportForcedOffline`).
 * 4. Hace polling activo del health check mientras está `offline`, para
 *    recuperar aunque el evento `online` del browser nunca dispare (ej.
 *    WiFi conectado pero el proveedor/Azure sigue caído).
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
	// #region Dependencies
	private platformId = inject(PLATFORM_ID);
	private capacitor = inject(CapacitorService);
	// #endregion

	// #region State
	private readonly _state = signal<ConnectivityState>('online');
	private pollHandle: ReturnType<typeof setInterval> | null = null;

	readonly state = this._state.asReadonly();
	readonly isOnline = computed(() => this._state() === 'online');
	readonly state$ = toObservable(this._state);
	readonly isOnline$ = toObservable(this.isOnline);
	// #endregion

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		if (this.isBrowser) {
			this._state.set(navigator.onLine ? 'online' : 'offline');
			window.addEventListener('online', this.onBrowserOnline);
			window.addEventListener('offline', this.onBrowserOffline);
			// Root singleton, vive toda la sesión de la app — no hace falta
			// desuscribirse (equivalente a los `addEventListener` de arriba).
			this.capacitor.onNetworkChange((connected) => {
				if (connected) this.onBrowserOnline();
				else this.onBrowserOffline();
			});
			if (this._state() === 'offline') this.startPolling();
		}
	}

	// #region Public API (consumido por el interceptor HTTP — piece 2)

	/**
	 * El interceptor llama esto tras N fallos de red/5xx consecutivos en una
	 * ventana de 30s. No espera al evento `offline` del browser/nativo —
	 * reacciona a la señal más fuerte (falla real contra `/api/*`).
	 */
	reportForcedOffline(): void {
		this.setState('offline');
	}

	/** El interceptor llama esto ante cualquier respuesta HTTP exitosa. */
	reportSuccess(): void {
		this.setState('online');
	}

	// #endregion

	// #region Event Handlers

	private onBrowserOffline = (): void => {
		logger.log('[Connectivity] Señal offline (browser/nativo)');
		this.setState('offline');
	};

	private onBrowserOnline = (): void => {
		// El evento 'online' puede dar falsos positivos (WiFi conectado sin
		// internet real, o red presente pero backend caído) — confirmar con
		// un probe real antes de despejar el estado degradado.
		logger.log('[Connectivity] Señal online (browser/nativo) — confirmando con probe');
		void this.probeHealth().then((reachable) => {
			if (reachable) this.setState('online');
		});
	};

	// #endregion

	// #region State Machine

	private setState(next: ConnectivityState): void {
		const prev = this._state();
		if (prev === next) return;

		this._state.set(next);
		logger.log(`[Connectivity] ${prev} → ${next}`);

		if (next === 'offline') {
			this.startPolling();
		} else {
			this.stopPolling();
		}
	}

	private startPolling(): void {
		if (this.pollHandle) return;
		this.pollHandle = setInterval(() => {
			void this.probeHealth().then((reachable) => {
				if (reachable) this.setState('online');
			});
		}, DEGRADED_POLL_INTERVAL_MS);
	}

	private stopPolling(): void {
		if (this.pollHandle) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}

	// #endregion

	// #region Health Probe

	/**
	 * Prueba real de conectividad: HEAD a `/api/health` con `fetch` crudo —
	 * deliberadamente NO pasa por `HttpClient`/el pipeline de interceptores
	 * (evita loops con rate-limit/auth/error interceptor sobre una llamada
	 * de diagnóstico, no de negocio).
	 *
	 * Cualquier respuesta HTTP completa (200, 503 con BD degradada, etc.)
	 * cuenta como "reachable" — significa que el App Service SÍ responde
	 * (DEP-2 resuelto). Solo un fallo de red/timeout real (`fetch` rechaza)
	 * cuenta como "sigue offline".
	 */
	private async probeHealth(): Promise<boolean> {
		try {
			await fetch(`${environment.apiUrl}${HEALTH_PROBE_PATH}`, {
				method: 'HEAD',
				cache: 'no-store',
				signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
			});
			return true;
		} catch {
			return false;
		}
	}

	// #endregion
}
// #endregion
