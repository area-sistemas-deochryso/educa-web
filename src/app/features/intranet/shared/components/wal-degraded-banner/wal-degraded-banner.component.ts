// #region Imports
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { WalStatusFacade } from '@core/services';
// #endregion

/**
 * WAL Resilience M2 — Banner que aparece cuando el WAL está en estado
 * degradado (circuit breaker `open` o modo `ephemeral`/`frozen`).
 *
 * No-bloqueante (INV-WAL-RES07). El usuario puede seguir mutando — los
 * entries se acumulan en `PENDING` hasta que el circuit cierre.
 *
 * Design system §B9 — color-mix con --yellow-500.
 */
@Component({
	selector: 'app-wal-degraded-banner',
	standalone: true,
	imports: [ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './wal-degraded-banner.component.html',
	styleUrl: './wal-degraded-banner.component.scss',
})
export class WalDegradedBannerComponent {
	// #region Dependencies

	private walStatus = inject(WalStatusFacade);

	// #endregion

	// #region State

	private readonly _retrying = signal(false);

	// #endregion

	// #region Public reactive state

	readonly vm = this.walStatus.vm;
	readonly retrying = this._retrying.asReadonly();

	// #endregion

	// #region Event Handlers

	async onForceRetry(): Promise<void> {
		this._retrying.set(true);
		try {
			await this.walStatus.forceRetry();
		} finally {
			this._retrying.set(false);
		}
	}

	// #endregion
}
