// #region Imports
import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { ViewAsContext, ViewAsRol } from './view-as-context.model';
// #endregion

// #region Implementation
/**
 * Holds the "ver como" (P92 F2) selection made by an Administrador while
 * browsing `estudiante/*`/`profesor/*` as another user. In-memory only —
 * a full reload loses it and `viewAsGateGuard` sends the admin back to the
 * picker on the next navigation, which is the safe default (no risk of a
 * stale selection surviving across tabs/sessions).
 *
 * Auto-clears when navigation leaves the module the context was chosen
 * for, so headers never leak into unrelated admin pages once the admin
 * navigates away without explicitly hitting "Salir" on the banner.
 */
@Injectable({ providedIn: 'root' })
export class ViewAsContextService {
	private readonly router = inject(Router);

	private readonly _activeContext = signal<ViewAsContext | null>(null);
	readonly activeContext = this._activeContext.asReadonly();

	constructor() {
		this.router.events
			.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
			.subscribe((event) => this.clearIfOutsideModule(event.urlAfterRedirects));
	}

	setContext(context: ViewAsContext): void {
		this._activeContext.set(context);
	}

	clearContext(): void {
		this._activeContext.set(null);
	}

	hasContextForRol(rol: ViewAsRol): boolean {
		return this._activeContext()?.rol === rol;
	}

	private clearIfOutsideModule(url: string): void {
		const context = this._activeContext();
		if (!context) return;

		const modulePrefix = `/intranet/${context.rol.toLowerCase()}`;
		if (!url.startsWith(modulePrefix)) {
			this._activeContext.set(null);
		}
	}
}
// #endregion
