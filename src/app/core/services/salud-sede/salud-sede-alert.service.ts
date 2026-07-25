// #region Imports
import { Injectable, effect, inject } from '@angular/core';

import { AuthService } from '@core/services/auth';
import { ErrorHandlerService } from '@core/services/error';
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
 * Instanciado desde `SessionActivityService` para que el `effect()` arranque
 * junto con el resto del ciclo de vida de sesión y capture el valor ya
 * seteado por el login que precede a la entrada a la intranet.
 */
@Injectable({ providedIn: 'root' })
export class SaludSedeAlertService {
	// #region Dependencies
	private readonly authService = inject(AuthService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly notificationsSound = inject(NotificationsSoundService);
	// #endregion

	constructor() {
		effect(() => {
			const dimensiones = this.authService.dimensionesSaludCritica();
			if (dimensiones.length === 0) return;

			this.showAlert(dimensiones);
		});
	}

	// #region Private helpers
	private showAlert(dimensiones: string[]): void {
		const etiquetas = dimensiones.map((d) => DIMENSION_LABELS[d] ?? d).join(', ');

		this.errorHandler.showWarning(
			'Salud de sede crítica',
			`Dimensión en estado Crítico: ${etiquetas}. Revisa la sección Salud de sede del panel de ayuda.`,
			8000,
		);
		this.notificationsSound.playSound();
	}
	// #endregion
}
