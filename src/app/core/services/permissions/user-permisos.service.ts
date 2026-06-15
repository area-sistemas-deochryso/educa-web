import { Injectable, inject, signal, computed, DestroyRef, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { logger, Duration } from '@core/helpers';
import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermissionsService } from './permisos.service';
import { CAPABILITY_TO_ROUTE } from '@shared/constants/permission-registry';

const CAPABILITIES_TTL = Duration.minutes(30);
const CAPABILITIES_REFRESH_INTERVAL = Duration.minutes(5);

@Injectable({
	providedIn: 'root',
})
export class UserPermissionsService {
	// #region Dependencies
	private authService = inject(AuthService);
	private permisosService = inject(PermissionsService);
	private storageService = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Private state
	private refreshTimer: ReturnType<typeof setInterval> | null = null;
	private readonly _capabilities = signal<string[]>([]);
	private readonly _loading = signal(false);
	private readonly _loaded = signal(false);
	private readonly _loadFailed = signal(false);
	private _lastFetchTimestamp = 0;
	private wasAuthenticated = false;
	// #endregion

	// #region Public readonly state
	readonly capabilities = this._capabilities.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loaded = this._loaded.asReadonly();
	readonly loadFailed = this._loadFailed.asReadonly();
	readonly isAuthenticated = toSignal(this.authService.isAuthenticated$, { initialValue: false });

	readonly vistasPermitidas = computed<string[]>(() => {
		const caps = this._capabilities();
		const routes: string[] = [];
		for (const code of caps) {
			const route = CAPABILITY_TO_ROUTE.get(code);
			if (route) routes.push(route);
		}
		return routes;
	});
	// #endregion

	constructor() {
		this.loadFromStorage();

		effect(() => {
			const authenticated = this.isAuthenticated();

			if (!authenticated) {
				this.resetState();
				this.wasAuthenticated = false;
				this.stopRefresh();
			} else if (!this.wasAuthenticated) {
				this.resetState();
				this.wasAuthenticated = true;
				this.loadFromStorage();
				this.startRefresh();
			}
		});
	}

	// #region Storage I/O

	private loadFromStorage(): void {
		const stored = this.storageService.getPermisos();
		if (stored && Array.isArray(stored.capabilities)) {
			this._capabilities.set(stored.capabilities);
			this._lastFetchTimestamp = stored.timestamp ?? 0;
			this._loaded.set(true);
		}
	}

	private saveToStorage(capabilities: string[]): void {
		this.storageService.setPermisos({
			capabilities,
			timestamp: Date.now(),
		});
	}

	// #endregion

	// #region Load permissions

	loadPermisos(destroyRef: DestroyRef): void {
		if (!this.authService.isAuthenticated) {
			this.clear();
			return;
		}

		if (this._loaded() || this._loading()) return;

		this._loading.set(true);

		firstValueFrom(this.permisosService.getMyCapabilities())
			.then((caps) => {
				this._capabilities.set(caps);
				this._loaded.set(true);
				this._loading.set(false);
				this._lastFetchTimestamp = Date.now();
				this.saveToStorage(caps);
			})
			.catch(() => {
				this._loading.set(false);
				this._loaded.set(true);
			});
	}

	async ensurePermisosLoaded(): Promise<boolean> {
		if (!this.authService.isAuthenticated) {
			this.clear();
			return false;
		}

		if (this._loaded() && this._capabilities().length > 0) return true;
		if (this._loadFailed()) return false;

		if (!this._loading()) {
			this._loading.set(true);
			this._loadFailed.set(false);

			try {
				const caps = await firstValueFrom(this.permisosService.getMyCapabilities());
				this._capabilities.set(caps);
				this._loaded.set(true);
				this._loading.set(false);
				this._lastFetchTimestamp = Date.now();
				this.saveToStorage(caps);
				return true;
			} catch (error) {
				logger.error('[UserPermisos] Error loading capabilities:', error);
				this._loading.set(false);
				this._loaded.set(false);
				this._loadFailed.set(true);
				return false;
			}
		}

		await this.waitForLoaded();
		return !this._loadFailed() && this._capabilities().length > 0;
	}

	private waitForLoaded(): Promise<void> {
		return new Promise((resolve) => {
			const check = (): void => {
				if (this._loaded() || this._loadFailed()) resolve();
				else setTimeout(check, 50);
			};
			check();
		});
	}

	// #endregion

	// #region Authorization

	tienePermiso(ruta: string): boolean {
		const vistas = this.vistasPermitidas();

		if (this._loaded() && vistas.length === 0) return true;
		if (!this._loaded()) return false;

		const rutaNorm = (ruta.startsWith('/') ? ruta.substring(1) : ruta).toLowerCase();

		return vistas.some((vista) => {
			const vistaNorm = (vista.startsWith('/') ? vista.substring(1) : vista).toLowerCase();
			return rutaNorm === vistaNorm;
		});
	}

	// #endregion

	// #region Commands

	clear(): void {
		this.stopRefresh();
		this.resetState();
		this.storageService.clearPermisos();
	}

	reloadPermisos(destroyRef: DestroyRef): void {
		this._loaded.set(false);
		this._loading.set(false);
		this.loadPermisos(destroyRef);
	}

	// #endregion

	// #region Private helpers

	private resetState(): void {
		this._capabilities.set([]);
		this._loaded.set(false);
		this._loading.set(false);
		this._loadFailed.set(false);
		this._lastFetchTimestamp = 0;
	}

	// #endregion

	// #region Periodic refresh

	private startRefresh(): void {
		this.stopRefresh();

		this.refreshTimer = setInterval(() => {
			const elapsed = Date.now() - this._lastFetchTimestamp;
			if (elapsed >= CAPABILITIES_TTL.ms) {
				this.fetchCapabilitiesFromApi();
			}
		}, CAPABILITIES_REFRESH_INTERVAL.ms);

		this.destroyRef.onDestroy(() => this.stopRefresh());
	}

	private stopRefresh(): void {
		if (this.refreshTimer !== null) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	private fetchCapabilitiesFromApi(): void {
		firstValueFrom(this.permisosService.getMyCapabilities())
			.then((caps) => {
				if (caps.length > 0) {
					this._capabilities.set(caps);
					this._loaded.set(true);
					this._lastFetchTimestamp = Date.now();
					this.saveToStorage(caps);
				}
			})
			.catch(() => {
				// Best-effort refresh — keep existing capabilities on failure.
			});
	}

	// #endregion
}
