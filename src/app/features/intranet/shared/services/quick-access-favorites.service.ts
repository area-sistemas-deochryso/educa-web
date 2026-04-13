import { computed, Injectable, inject, signal } from '@angular/core';

import { StorageService } from '@core/services';
import { MENU_ITEMS, PreviewLayout } from '@intranet-shared/config/intranet-menu.config';
import { PermisoPath } from '@shared/constants';

export const MAX_QUICK_ACCESS = 4;

export interface ResolvedFavorite {
	route: string;
	label: string;
	icon: string;
	permiso: PermisoPath;
	description: string;
	preview: PreviewLayout;
}

@Injectable({ providedIn: 'root' })
export class QuickAccessFavoritesService {
	private prefs = inject(StorageService);

	// #region Estado privado
	private readonly _favoriteRoutes = signal<string[]>(this.prefs.getFavoriteRoutes());
	// #endregion

	// #region Lecturas públicas
	readonly favoriteRoutes = this._favoriteRoutes.asReadonly();
	readonly hasFavorites = computed(() => this._favoriteRoutes().length > 0);
	readonly canAddMore = computed(() => this._favoriteRoutes().length < MAX_QUICK_ACCESS);
	// #endregion

	// #region Comandos
	isFavorite(route: string): boolean {
		return this._favoriteRoutes().includes(route);
	}

	toggleFavorite(route: string): boolean {
		const current = this._favoriteRoutes();

		if (current.includes(route)) {
			const updated = current.filter((r) => r !== route);
			this._favoriteRoutes.set(updated);
			this.prefs.setFavoriteRoutes(updated);
			return true;
		}

		if (current.length >= MAX_QUICK_ACCESS) return false;

		const updated = [...current, route];
		this._favoriteRoutes.set(updated);
		this.prefs.setFavoriteRoutes(updated);
		return true;
	}

	/** Resuelve las rutas favoritas a items con metadata de MENU_ITEMS. */
	resolveFavorites(): ResolvedFavorite[] {
		return this._favoriteRoutes()
			.map((route) => {
				const menuItem = MENU_ITEMS.find((m) => m.route === route);
				if (!menuItem) return null;
				return {
					route: menuItem.route,
					label: menuItem.label,
					icon: menuItem.icon.replace('pi ', ''),
					permiso: menuItem.permiso,
					description: menuItem.description ?? '',
					preview: menuItem.preview ?? 'admin-table',
				} satisfies ResolvedFavorite;
			})
			.filter((item): item is ResolvedFavorite => item !== null);
	}
	// #endregion
}
