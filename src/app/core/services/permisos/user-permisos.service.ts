import { Injectable, inject, signal, computed, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { tap, catchError, of, firstValueFrom, timer, Subject, takeUntil } from 'rxjs';

import { logger, isJwtExpired } from '@core/helpers';
import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermisosService } from './permisos.service';
import { PermisosUsuarioResultado } from './permisos.models';

/**
 * Interval in ms to check for expired permissions token.
 */
const PERMISOS_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * User permissions service.
 *
 * Responsibilities:
 * - Reactive permissions state (signals)
 * - Load from storage and API
 * - Periodic refresh when token expires
 * - Authorization check via tienePermiso
 */
@Injectable({
	providedIn: 'root',
})
export class UserPermisosService {
	// #region Dependencies
	private authService = inject(AuthService);
	private permisosService = inject(PermisosService);
	private storageService = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Private state
	private readonly stopRefresh$ = new Subject<void>();
	private readonly _permisos = signal<PermisosUsuarioResultado | null>(null);
	private readonly _loading = signal(false);
	private readonly _loaded = signal(false);
	private readonly _loadFailed = signal(false);
	private wasAuthenticated = false;
	// #endregion

	// #region Public readonly state
	readonly permisos = this._permisos.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loaded = this._loaded.asReadonly();
	readonly loadFailed = this._loadFailed.asReadonly();
	readonly isAuthenticated = toSignal(this.authService.isAuthenticated$, { initialValue: false });
	readonly vistasPermitidas = computed(() => this._permisos()?.vistasPermitidas ?? []);
	readonly tienePermisosPersonalizados = computed(
		() => this._permisos()?.tienePermisosPersonalizados ?? false,
	);
	// #endregion

	constructor() {
		this.loadFromStorage();

		// React to auth state changes.
		effect(() => {
			const authenticated = this.isAuthenticated();

			if (!authenticated) {
				this.resetState();
				this.wasAuthenticated = false;
				this.stopPermisosRefresh();
			} else if (!this.wasAuthenticated) {
				// New login: reset to allow a fresh load.
				this.resetState();
				this.wasAuthenticated = true;
				this.loadFromStorage();
				this.startPermisosRefresh();
			}
		});
	}

	// #region Storage I/O

	/**
	 * Load permissions from storage into signals.
	 */
	private loadFromStorage(): void {
		const stored = this.storageService.getPermisos();
		if (stored) {
			this._permisos.set(stored);
			this._loaded.set(true);
		}
	}

	/**
	 * Persist permissions into storage.
	 *
	 * @param permisos Permissions payload.
	 */
	private saveToStorage(permisos: PermisosUsuarioResultado): void {
		this.storageService.setPermisos(permisos);
	}

	// #endregion

	// #region Load permissions

	/**
	 * Load permissions for the current user using an observable flow.
	 *
	 * @param destroyRef DestroyRef for auto cleanup.
	 */
	loadPermisos(destroyRef: DestroyRef): void {
		if (!this.authService.isAuthenticated) {
			this.clear();
			return;
		}

		if (this._loaded() || this._loading()) return;

		this._loading.set(true);

		this.permisosService
			.getMisPermisos()
			.pipe(
				tap((permisos) => {
					this._permisos.set(permisos);
					this._loaded.set(true);
					this._loading.set(false);
					if (permisos) this.saveToStorage(permisos);
				}),
				catchError(() => {
					this._loading.set(false);
					this._loaded.set(true);
					return of(null);
				}),
				takeUntilDestroyed(destroyRef),
			)
			.subscribe();
	}

	/**
	 * Load permissions and return a Promise for guards.
	 *
	 * @returns True when permissions were loaded.
	 */
	async ensurePermisosLoaded(): Promise<boolean> {
		if (!this.authService.isAuthenticated) {
			this.clear();
			return false;
		}

		if (this._loaded() && this._permisos() !== null) return true;
		if (this._loadFailed()) return false;

		if (!this._loading()) {
			this._loading.set(true);
			this._loadFailed.set(false);

			try {
				const permisos = await firstValueFrom(this.permisosService.getMisPermisos());
				this._permisos.set(permisos);
				this._loaded.set(true);
				this._loading.set(false);
				if (permisos) this.saveToStorage(permisos);
				return true;
			} catch (error) {
				logger.error('[UserPermisos] Error cargando permisos:', error);
				this._loading.set(false);
				this._loaded.set(false);
				this._loadFailed.set(true);
				return false;
			}
		}

		// Already loading, wait for completion.
		await this.waitForLoaded();
		return !this._loadFailed() && this._permisos() !== null;
	}

	/**
	 * Wait until loading completes or fails.
	 */
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

	/**
	 * Check if the user has permission for a route.
	 *
	 * Exact match only. Having "intranet" does not grant "intranet/admin".
	 *
	 * @param ruta Route path.
	 * @returns True if allowed.
	 */
	tienePermiso(ruta: string): boolean {
		const vistas = this.vistasPermitidas();

		// No permissions configured, allow all.
		if (this._loaded() && vistas.length === 0) return true;

		// Permissions not loaded, deny by default.
		if (!this._loaded()) return false;

		const rutaNorm = (ruta.startsWith('/') ? ruta.substring(1) : ruta).toLowerCase();

		return vistas.some((vista) => {
			const vistaNorm = (vista.startsWith('/') ? vista.substring(1) : vista).toLowerCase();
			return rutaNorm === vistaNorm;
		});
	}

	// #endregion

	// #region Commands

	/**
	 * Clear permissions for logout.
	 */
	clear(): void {
		this.stopPermisosRefresh();
		this.resetState();
		this.storageService.clearPermisos();
	}

	/**
	 * Reload permissions from the server.
	 *
	 * @param destroyRef DestroyRef for auto cleanup.
	 */
	reloadPermisos(destroyRef: DestroyRef): void {
		this._loaded.set(false);
		this._loading.set(false);
		this.loadPermisos(destroyRef);
	}

	// #endregion

	// #region Private helpers

	/**
	 * Reset all internal signals.
	 */
	private resetState(): void {
		this._permisos.set(null);
		this._loaded.set(false);
		this._loading.set(false);
		this._loadFailed.set(false);
	}

	// #endregion

	// #region Periodic refresh

	/**
	 * Periodically check for expired permissions token and refresh from API.
	 */
	private startPermisosRefresh(): void {
		this.stopPermisosRefresh();

		timer(0, PERMISOS_CHECK_INTERVAL_MS)
			.pipe(takeUntil(this.stopRefresh$), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				const stored = this.storageService.getPermisos();
				if (stored?.permisosToken && isJwtExpired(stored.permisosToken)) {
					this.fetchPermisosFromApi();
				}
			});
	}

	/**
	 * Stop the periodic refresh.
	 */
	private stopPermisosRefresh(): void {
		this.stopRefresh$.next();
	}

	/**
	 * Fetch permissions from API and update state.
	 */
	private fetchPermisosFromApi(): void {
		this.permisosService
			.getMisPermisos()
			.pipe(takeUntil(this.stopRefresh$))
			.subscribe((permisos) => {
				if (permisos) {
					this._permisos.set(permisos);
					this._loaded.set(true);
					this.saveToStorage(permisos);
				}
			});
	}

	// #endregion
}
