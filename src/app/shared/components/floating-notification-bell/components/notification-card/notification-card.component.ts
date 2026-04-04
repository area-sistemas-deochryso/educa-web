import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeasonalNotification } from '@core/services';
import { NotificationsPanelContext } from '../../notifications-panel.context';
import { NotifTypeLabelPipe, NotifPriorityLabelPipe, NotifTypeIconPipe } from './notification-card.pipes';

@Component({
	selector: 'app-notification-card',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, RouterLink, NotifTypeLabelPipe, NotifPriorityLabelPipe, NotifTypeIconPipe],
	templateUrl: './notification-card.component.html',
	styleUrl: './notification-card.component.scss',
})
export class NotificationCardComponent {
	// * Context provides read/unread + dismiss actions.
	private context = inject(NotificationsPanelContext);

	// * Inputs drive card visuals and animation.
	@Input({ required: true }) notification!: SeasonalNotification;
	@Input() isRead = false;
	@Input() animationDelay = 0;

	get priorityClass(): string {
		return `notification-${this.notification.priority}`;
	}

	onCardClick(): void {
		// * Mark as read when opening the card.
		if (!this.isRead) {
			this.context.markAsRead(this.notification.id);
		}
	}

	onMarkAsRead(event: Event): void {
		// * Explicit action to mark as read.
		event.stopPropagation();
		this.context.markAsRead(this.notification.id);
	}

	onMarkAsUnread(event: Event): void {
		// * Explicit action to mark as unread.
		event.stopPropagation();
		this.context.markAsUnread(this.notification.id);
	}

	onDismiss(event: Event): void {
		// * Dismiss this notification.
		event.stopPropagation();
		this.context.dismiss(this.notification.id);
	}

	onActionClick(event: Event): void {
		event.stopPropagation();
	}
}
