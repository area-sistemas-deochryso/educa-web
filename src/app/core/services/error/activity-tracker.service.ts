import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { Breadcrumb, BreadcrumbTipo } from './activity-tracker.models';

const MAX_BREADCRUMBS = 30;

@Injectable({ providedIn: 'root' })
export class ActivityTrackerService {
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	private readonly buffer: Breadcrumb[] = [];
	private previousRoute = '';

	constructor() {
		this.trackNavigation();
	}

	// #region API pública

	track(tipo: BreadcrumbTipo, descripcion: string, metadata?: Record<string, string>): void {
		this.push({
			tipo,
			descripcion,
			ruta: this.router.url,
			timestamp: Date.now(),
			metadata,
		});
	}

	trackApiCall(method: string, url: string, status: number, durationMs: number): void {
		const tipo: BreadcrumbTipo = status >= 400 ? 'API_ERROR' : 'API_CALL';
		// Limpiar URL: solo path, sin query params sensibles
		const cleanUrl = this.sanitizeUrl(url);

		this.push({
			tipo,
			descripcion: `${method} ${cleanUrl} (${status}, ${Math.round(durationMs)}ms)`,
			ruta: this.router.url,
			timestamp: Date.now(),
			metadata: { method, status: String(status), durationMs: String(Math.round(durationMs)) },
		});
	}

	getBreadcrumbs(maxCount: number): Breadcrumb[] {
		const count = Math.min(maxCount, this.buffer.length);
		return this.buffer.slice(-count);
	}

	// #endregion

	// #region Navegación

	private trackNavigation(): void {
		this.router.events
			.pipe(
				filter((event): event is NavigationEnd => event instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				const from = this.previousRoute || '(inicio)';
				const to = event.urlAfterRedirects;
				this.previousRoute = to;

				this.push({
					tipo: 'NAVIGATION',
					descripcion: `"${from}" → "${to}"`,
					ruta: to,
					timestamp: Date.now(),
				});
			});
	}

	// #endregion

	// #region Ring buffer

	private push(breadcrumb: Breadcrumb): void {
		if (this.buffer.length >= MAX_BREADCRUMBS) {
			this.buffer.shift();
		}
		this.buffer.push(breadcrumb);
	}

	// #endregion

	// #region Helpers

	private sanitizeUrl(url: string): string {
		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
			const parsed = new URL(url, origin);
			// Solo devolver path sin query params (pueden contener datos sensibles)
			return parsed.pathname;
		} catch {
			// Si no es URL válida, devolver como está pero truncar
			return url.split('?')[0].substring(0, 200);
		}
	}

	// #endregion
}
