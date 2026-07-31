// #region Imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SaludSedeAlertService } from '@core/services/salud-sede';
// #endregion

// #region Implementation
/**
 * Banner de ancho completo bajo el header para la alerta de salud de sede
 * crítica (mismo patrón "franja bajo el header" que
 * `WalDegradedBannerComponent`/`ViewAsBannerComponent`, Design system §B9).
 * Reemplaza el toast genérico que usaba `ErrorHandlerService.showWarning`
 * (auditoría /intranet/ayuda, hallazgo 05): ese toast comparte forma con las
 * notificaciones de error reales de la app, y esta alerta no lo es.
 */
@Component({
	selector: 'app-salud-sede-banner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salud-sede-banner.component.html',
	styleUrl: './salud-sede-banner.component.scss',
})
export class SaludSedeBannerComponent {
	private readonly alert = inject(SaludSedeAlertService);

	readonly visible = this.alert.visible;
	readonly mensaje = this.alert.mensaje;

	dismiss(): void {
		this.alert.dismiss();
	}
}
// #endregion
