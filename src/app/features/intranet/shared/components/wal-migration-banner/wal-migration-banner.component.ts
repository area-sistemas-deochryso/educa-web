// #region Imports
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { WalStatusFacade } from '@core/services';
import { ButtonModule } from 'primeng/button';
// #endregion

/**
 * F-S08 — Banner que aparece cuando el WAL tiene entries en estado REQUIRES_MIGRATION.
 * Dismissible por sesión de componente (reaparece en cada reload si el estado persiste).
 * Design system §B9 — color-mix con --yellow-500.
 */
@Component({
	selector: 'app-wal-migration-banner',
	standalone: true,
	imports: [ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './wal-migration-banner.component.html',
	styleUrl: './wal-migration-banner.component.scss',
})
export class WalMigrationBannerComponent {
	// #region Dependencies

	private walStatus = inject(WalStatusFacade);

	// #endregion

	// #region State

	private readonly _dismissed = signal(false);
	private readonly _discarding = signal(false);

	// #endregion

	// #region Computed

	readonly isVisible = computed(() => this.walStatus.hasMigrations() && !this._dismissed());
	readonly migrationCount = this.walStatus.migrationCount;
	readonly discarding = this._discarding.asReadonly();

	// #endregion

	// #region Event Handlers

	dismiss(): void {
		this._dismissed.set(true);
	}

	async discardEntries(): Promise<void> {
		this._discarding.set(true);
		try {
			await this.walStatus.discardMigrationEntries();
			// hasMigrations() cae a false reactivamente — banner desaparece solo
		} finally {
			this._discarding.set(false);
		}
	}

	// #endregion
}
