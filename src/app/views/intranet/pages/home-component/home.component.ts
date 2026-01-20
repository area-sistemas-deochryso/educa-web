import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationsService } from '@app/services';
import { IntranetBackground } from '../../components/intranet-background/intranet-background';

@Component({
	selector: 'app-home.component',
	imports: [CommonModule, RouterLink, IntranetBackground],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
})
export class HomeComponent {
	private notificationsService = inject(NotificationsService);

	unreadCount = this.notificationsService.unreadCount;
	highestPriority = this.notificationsService.highestPriority;

	togglePanel(): void {
		this.notificationsService.togglePanel();
	}

	/**
	 * Obtiene la clase de color del badge según la prioridad más alta
	 */
	getBadgePriorityClass(): string {
		const priority = this.highestPriority();
		if (!priority) return '';
		return `badge-${priority}`;
	}
}
