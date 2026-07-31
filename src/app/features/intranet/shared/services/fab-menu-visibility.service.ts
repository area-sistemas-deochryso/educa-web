import { Injectable, inject, signal } from '@angular/core';

import { StorageService } from '@core/services';

/**
 * Estado compartido de visibilidad del FAB único (Ayuda + Reportar fusionados).
 * El propio FAB expone la acción "Ocultar"; `UserProfileMenuComponent` expone
 * "Mostrar accesos flotantes" cuando está oculto — ninguno referencia al otro
 * directamente, ambos leen/escriben acá.
 */
@Injectable({ providedIn: 'root' })
export class FabMenuVisibilityService {
	private prefs = inject(StorageService);

	private readonly _hidden = signal(this.prefs.getFabMenuHidden());
	readonly hidden = this._hidden.asReadonly();

	hide(): void {
		this._hidden.set(true);
		this.prefs.setFabMenuHidden(true);
	}

	show(): void {
		this._hidden.set(false);
		this.prefs.setFabMenuHidden(false);
	}
}
