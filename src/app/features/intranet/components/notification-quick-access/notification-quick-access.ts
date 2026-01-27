import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationsService } from '@core/services';

@Component({
	selector: 'app-notification-quick-access',
	standalone: true,
	imports: [NgClass],
	templateUrl: './notification-quick-access.html',
	styleUrl: './notification-quick-access.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationQuickAccessComponent {
	private notificationsService = inject(NotificationsService);

	readonly unreadCount = this.notificationsService.unreadCount;
	readonly highestPriority = this.notificationsService.highestPriority;

	readonly badgePriorityClass = computed(() => {
		const priority = this.highestPriority();
		if (!priority) return '';
		return `badge-${priority}`;
	});

	togglePanel(): void {
		this.notificationsService.togglePanel();
	}
}
