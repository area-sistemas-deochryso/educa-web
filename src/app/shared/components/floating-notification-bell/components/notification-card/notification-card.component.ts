// #region Imports
import { ChangeDetectionStrategy, Component, Input, Pipe, PipeTransform, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeasonalNotification } from '@core/services';
import { NotificationsPanelContext } from '../../notifications-panel.context';

// #endregion

// #region Pipes
const TYPE_LABELS: Record<string, string> = {
	matricula: 'Matrícula',
	pago: 'Pago',
	academico: 'Académico',
	festividad: 'Festividad',
	evento: 'Evento',
	smart: 'Smart',
};

const TYPE_ICONS: Record<string, string> = {
	matricula: 'pi-user-plus',
	pago: 'pi-wallet',
	academico: 'pi-chart-bar',
	festividad: 'pi-star',
	evento: 'pi-calendar',
	smart: 'pi-bolt',
};

const PRIORITY_LABELS: Record<string, string> = {
	urgent: 'Urgente',
	high: 'Importante',
	medium: 'Normal',
	low: 'Info',
};

@Pipe({ name: 'notifTypeLabel', standalone: true, pure: true })
export class NotifTypeLabelPipe implements PipeTransform {
	transform(type: string): string {
		return TYPE_LABELS[type] || type;
	}
}

@Pipe({ name: 'notifPriorityLabel', standalone: true, pure: true })
export class NotifPriorityLabelPipe implements PipeTransform {
	transform(priority: string): string {
		return PRIORITY_LABELS[priority] || priority;
	}
}

@Pipe({ name: 'notifTypeIcon', standalone: true, pure: true })
export class NotifTypeIconPipe implements PipeTransform {
	transform(type: string): string {
		return TYPE_ICONS[type] || 'pi-bell';
	}
}
// #endregion
// #region Implementation
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
// #endregion
