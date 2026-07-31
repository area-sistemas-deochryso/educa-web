// #region Imports
import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from '@core/services/auth';
import { NotificationsSoundService } from '@core/services/notifications';
// #endregion

/**
 * Dimensiones fijas de `SaludSedeDimension` con su etiqueta en español, para
 * el mensaje de la alerta. Duplicado deliberado de
 * `SALUD_SEDE_DIMENSION_LABELS` (sección `ayuda/sections/ayuda-salud-sede/`):
 * este service es `core/` (arranca con la sesión, fuera del lazy chunk de la
 * sección) y no debe importar del feature lazy-loaded.
 */
const DIMENSION_LABELS: Record<string, string> = {
	Infraestructura: 'Infraestructura',
	Profesorado: 'Profesorado',
	SituacionGeneral: 'Situación general',
};

/**
 * Alerta de sesión (visual + sonora) para usuarios del tier Administrativo
 * cuando el login/refresh indica una dimensión de salud de sede en Crítico
 * (xrepo-panel-ayuda-intranet F6). No es tiempo real — reacciona al signal
 * `AuthService.dimensionesSaludCritica`, que se actualiza en cada
 * login/refresh. El BE ya filtra por rol (tier no-Administrativo siempre
 * recibe lista vacía) — este service no repite ese gate.
 *
 * Expone `mensaje`/`visible` a `SaludSedeBannerComponent` (banner de ancho
 * completo bajo el header) en vez de pasar por el toast genérico de errores:
 * el toast comparte estilo con notificaciones de error reales y esta alerta
 * no lo es (auditoría /intranet/ayuda, hallazgo 05).
 *
 * Instanciado desde `SessionActivityService` para que el `effect()` arranque
 * junto con el resto del ciclo de vida de sesión y capture el valor ya
 * seteado por el login que precede a la entrada a la intranet.
 */
@Injectable({ providedIn: 'root' })
export class SaludSedeAlertService {
	// #region Dependencies
	private readonly authService = inject(AuthService);
	private readonly notificationsSound = inject(NotificationsSoundService);
	// #endregion

	private readonly _dismissed = signal(false);

	readonly mensaje = computed(() => {
		const dimensiones = this.authService.dimensionesSaludCritica();
		if (dimensiones.length === 0) return null;
		const etiquetas = dimensiones.map((d) => DIMENSION_LABELS[d] ?? d).join(', ');
		return `Dimensión en estado Crítico: ${etiquetas}. Revisa la sección Salud de sede del panel de ayuda.`;
	});

	readonly visible = computed(() => this.mensaje() !== null && !this._dismissed());

	constructor() {
		effect(() => {
			const dimensiones = this.authService.dimensionesSaludCritica();
			if (dimensiones.length === 0) return;

			this._dismissed.set(false);
			this.notificationsSound.playSound();
		});
	}

	dismiss(): void {
		this._dismissed.set(true);
	}
}
