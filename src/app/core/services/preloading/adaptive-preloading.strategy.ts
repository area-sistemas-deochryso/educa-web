import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';

/**
 * Only preloads lazy routes on fast connections (4G+ or WiFi).
 * On slow networks (2G/3G, save-data), skips preloading to save bandwidth.
 */
@Injectable({ providedIn: 'root' })
export class AdaptivePreloadingStrategy implements PreloadingStrategy {
	preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
		if (this.shouldPreload()) {
			return load();
		}
		return EMPTY;
	}

	private shouldPreload(): boolean {
		const nav = navigator as Navigator & {
			connection?: { saveData?: boolean; effectiveType?: string };
		};

		const conn = nav.connection;
		if (!conn) return true; // API not available — preload by default

		if (conn.saveData) return false;
		if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return false;

		return true;
	}
}
