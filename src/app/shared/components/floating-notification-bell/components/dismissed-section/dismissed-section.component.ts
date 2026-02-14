// #region Imports
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonalNotification } from '@core/services';
import { DismissedCardComponent } from '../dismissed-card/dismissed-card.component';
import { NotificationsPanelContext } from '../../notifications-panel.context';

// #endregion
// #region Implementation
@Component({
	selector: 'app-dismissed-section',
	imports: [CommonModule, DismissedCardComponent],
	templateUrl: './dismissed-section.component.html',
	styleUrl: './dismissed-section.component.scss',
})
export class DismissedSectionComponent {
	// * Shared context drives dismissed state/actions.
	private context = inject(NotificationsPanelContext);

	// * Signals for template bindings.
	dismissedNotifications = this.context.dismissedNotifications;
	dismissedCount = this.context.dismissedCount;
	showHistory = this.context.showDismissedHistory;

	// * Toggle dismissed history visibility.
	onToggleHistory(): void {
		this.context.toggleDismissedHistory();
	}

	// * Restore all dismissed notifications.
	onRestoreAll(): void {
		this.context.restoreAll();
	}

	// * Restore a single notification.
	onRestore(id: string): void {
		this.context.restore(id);
	}

	trackById(_index: number, notification: SeasonalNotification): string {
		return notification.id;
	}
}
// #endregion
