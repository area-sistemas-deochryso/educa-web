import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeasonalNotification } from '@core/services';
import { NotificationsPanelContext } from '../../notifications-panel.context';

@Component({
	selector: 'app-notification-card',
	imports: [CommonModule, RouterLink],
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

	getTypeIcon(type: string): string {
		// * Map backend types to icons.
		const icons: Record<string, string> = {
			matricula: 'pi-user-plus',
			pago: 'pi-wallet',
			academico: 'pi-chart-bar',
			festividad: 'pi-star',
			evento: 'pi-calendar',
		};
		return icons[type] || 'pi-bell';
	}

	getTypeLabel(type: string): string {
		// * Map backend types to display labels.
		const labels: Record<string, string> = {
			matricula: 'Matrícula',
			pago: 'Pago',
			academico: 'Académico',
			festividad: 'Festividad',
			evento: 'Evento',
		};
		return labels[type] || type;
	}

	getPriorityLabel(priority: string): string {
		// * Map priority to short badge labels.
		const labels: Record<string, string> = {
			urgent: 'Urgente',
			high: 'Importante',
			medium: 'Normal',
			low: 'Info',
		};
		return labels[priority] || priority;
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
