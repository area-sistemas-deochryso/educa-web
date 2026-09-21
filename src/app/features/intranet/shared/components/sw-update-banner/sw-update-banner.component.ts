// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { environment } from '@config/environment';
import { SwService } from '@core/services/sw';
import { EduButton } from '@edu-ui';
// #endregion

/**
 * F-SW01 (A) — Banner global "nueva versión disponible".
 *
 * Consume `SwService.updateAvailable$` (se activa cuando el SW instalado
 * queda en espera tras un deploy) y ofrece CTA "Recargar para actualizar"
 * que ejecuta `SwService.update()` (SKIP_WAITING + reload).
 *
 * No-dismissible y sin refresh automático (preserva formularios).
 * Oculto en dev local vía `environment.production` (build-time, no
 * isDevMode() — roto en Angular 22 + esbuild).
 *
 * Design system §B9 — color-mix con --blue-500 (info).
 */
@Component({
	selector: 'app-sw-update-banner',
	standalone: true,
	imports: [EduButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sw-update-banner.component.html',
	styleUrl: './sw-update-banner.component.scss',
})
export class SwUpdateBannerComponent {
	// #region Dependencies
	private sw = inject(SwService);
	// #endregion

	// #region Reactive state
	private readonly updateAvailable = toSignal(this.sw.updateAvailable$, {
		initialValue: false,
	});
	readonly showBanner = computed(
		() => this.updateAvailable() && environment.production,
	);
	// #endregion

	// #region Event handlers
	onReload(): Promise<void> {
		return this.sw.update();
	}
	// #endregion
}
