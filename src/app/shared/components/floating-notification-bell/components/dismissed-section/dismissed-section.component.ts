import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonalNotification } from '@core/services';
import { DismissedCardComponent } from '../dismissed-card/dismissed-card.component';
import { NotificationsPanelContext } from '../../notifications-panel.context';

@Component({
	selector: 'app-dismissed-section',
	imports: [CommonModule, DismissedCardComponent],
	templateUrl: './dismissed-section.component.html',
	styleUrl: './dismissed-section.component.scss',
})
export class DismissedSectionComponent {
	private context = inject(NotificationsPanelContext);

	dismissedNotifications = this.context.dismissedNotifications;
	dismissedCount = this.context.dismissedCount;
	showHistory = this.context.showDismissedHistory;

	onToggleHistory(): void {
		this.context.toggleDismissedHistory();
	}

	onRestoreAll(): void {
		this.context.restoreAll();
	}

	onRestore(id: string): void {
		this.context.restore(id);
	}

	trackById(_index: number, notification: SeasonalNotification): string {
		return notification.id;
	}
}
