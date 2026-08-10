// #region Imports
import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import { StorageService } from '@core/services/storage';
import { SwService } from '@core/services/sw';

import { ViewAsContext, ViewAsRol } from './view-as-context.model';
// #endregion

// #region Implementation
/**
 * Holds the "ver como" (P92 F2) selection made by an Administrador while
 * browsing `estudiante/*`/`profesor/*` as another user.
 *
 * Persisted to `sessionStorage` (brief 511, F2) so an F5 or a direct link
 * into the module rehydrates the same profesor/estudiante instead of
 * dropping the admin back at the picker from scratch — `setContext` writes
 * through, the constructor restores on bootstrap, and `clearContext`/the
 * auto-clear below remove it again. Scoped to the tab (sessionStorage, not
 * localStorage) so it never survives across tabs/browser restarts, and it
 * self-heals on the very first `NavigationEnd` after restore: if the
 * reload landed outside the matching module, `clearIfOutsideModule` wipes
 * the restored value immediately, same as any other navigation.
 *
 * Auto-clears when navigation leaves the module the context was chosen
 * for, so headers never leak into unrelated admin pages once the admin
 * navigates away without explicitly hitting "Salir" on the banner. That
 * exit is intentional (security boundary), but doing it in total silence
 * was the bug in brief 511 (F1) — an admin browsing `ayuda` while still
 * impersonating had no signal the context was gone. A toast now announces
 * it via the shared `ErrorHandlerService` notification bus instead.
 */
@Injectable({ providedIn: 'root' })
export class ViewAsContextService {
	private readonly router = inject(Router);
	private readonly storage = inject(StorageService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly swService = inject(SwService);

	private readonly _activeContext = signal<ViewAsContext | null>(
		this.storage.getViewAsContext<ViewAsContext>(),
	);
	readonly activeContext = this._activeContext.asReadonly();

	constructor() {
		this.router.events
			.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
			.subscribe((event) => this.clearIfOutsideModule(event.urlAfterRedirects));
	}

	setContext(context: ViewAsContext): void {
		// SW cache key is URL-only (no identity component, brief 536) — clear it on every
		// identity switch or the previous subject's cached "mis-*" responses leak into this one.
		this.swService.clearCache();
		this._activeContext.set(context);
		this.storage.setViewAsContext(context);
	}

	clearContext(): void {
		this.swService.clearCache();
		this._activeContext.set(null);
		this.storage.setViewAsContext(null);
	}

	hasContextForRol(rol: ViewAsRol): boolean {
		return this._activeContext()?.rol === rol;
	}

	private clearIfOutsideModule(url: string): void {
		const context = this._activeContext();
		if (!context) return;

		const modulePrefix = `/intranet/${context.rol.toLowerCase()}`;
		if (!url.startsWith(modulePrefix)) {
			this.swService.clearCache();
			this._activeContext.set(null);
			this.storage.setViewAsContext(null);
			this.errorHandler.showInfo(
				'"Ver como" finalizado',
				`Saliste del módulo de ${context.rol.toLowerCase()} y se cerró la vista como ${context.nombreCompleto}.`,
			);
		}
	}
}
// #endregion
