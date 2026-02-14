// #region Imports
import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationPriority, KeyboardShortcutsService } from '@core/services';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
	PriorityInfo,
	NotificationBellButtonComponent,
	NotificationsPanelComponent,
} from './components';
import { NotificationsPanelContext } from './notifications-panel.context';

// #endregion
// #region Implementation
const PRIORITY_LEGEND: PriorityInfo[] = [
	{
		priority: 'urgent',
		label: 'Urgente',
		description: 'Requiere atenciÃƒÂ³n inmediata. Fechas lÃƒÂ­mite prÃƒÂ³ximas o vencidas.',
		color: '#dc2626',
	},
	{
		priority: 'high',
		label: 'Importante',
		description: 'Alta prioridad. Acciones pendientes que requieren atenciÃƒÂ³n pronto.',
		color: '#ffcc0c',
	},
	{
		priority: 'medium',
		label: 'Normal',
		description: 'Prioridad estÃƒÂ¡ndar. InformaciÃƒÂ³n relevante para tu dÃƒÂ­a a dÃƒÂ­a.',
		color: '#253470',
	},
	{
		priority: 'low',
		label: 'Informativo',
		description: 'Baja prioridad. Datos generales y recordatorios.',
		color: '#77a02d',
	},
];

@Component({
	selector: 'app-floating-notification-bell',
	imports: [
		CommonModule,
		ToastModule,
		NotificationBellButtonComponent,
		NotificationsPanelComponent,
	],
	providers: [MessageService, NotificationsPanelContext],
	templateUrl: './floating-notification-bell.component.html',
	styleUrl: './floating-notification-bell.component.scss',
})
export class FloatingNotificationBellComponent implements OnInit, OnDestroy {
	// * Shared context for notifications + shortcut toggles.
	private context = inject(NotificationsPanelContext);
	private keyboardService = inject(KeyboardShortcutsService);
	private messageService = inject(MessageService);

	// * Expose context signals for template bindings.
	notificationCount = this.context.notificationCount;
	unreadCount = this.context.unreadCount;
	isPanelOpen = this.context.isPanelOpen;
	highestPriority = this.context.highestPriority;
	badgePriorityClass = this.context.badgePriorityClass;

	// * Context menu state (local to this component).
	showContextMenu = false;
	contextMenuPosition = { x: 0, y: 0 };
	priorityLegend = PRIORITY_LEGEND;

	private hasShownToast = false;

	ngOnInit(): void {
		// * Keyboard shortcut to open/close the panel.
		this.keyboardService.register('toggle-notification-bell', () => {
			this.context.togglePanel();
		});

		// * Toast hint when there are unread notifications.
		setTimeout(() => {
			if (this.unreadCount() > 0 && !this.hasShownToast) {
				this.showNotificationToast();
				this.hasShownToast = true;
			}
		}, 500);
	}

	ngOnDestroy(): void {
		this.keyboardService.unregister('toggle-notification-bell');
		this.context.closePanel();
	}

	/**
	 * Muestra un toast de PrimeNG para notificaciones importantes
	 */
	private showNotificationToast(): void {
		// * Map priority to toast visuals and play sound.
		const priority = this.highestPriority();
		const count = this.unreadCount();

		if (!priority) return;

		// Reproducir sonido
		this.context.playSound();

		const severityMap: Record<NotificationPriority, string> = {
			urgent: 'error',
			high: 'warn',
			medium: 'info',
			low: 'success',
		};

		const titleMap: Record<NotificationPriority, string> = {
			urgent: 'NotificaciÃƒÂ³n Urgente',
			high: 'NotificaciÃƒÂ³n Importante',
			medium: 'Nueva NotificaciÃƒÂ³n',
			low: 'InformaciÃƒÂ³n',
		};

		this.messageService.add({
			severity: severityMap[priority],
			summary: titleMap[priority],
			detail: `Tienes ${count} notificaciÃƒÂ³n${count > 1 ? 'es' : ''} sin leer. Haz clic en la campana para verlas.`,
			life: 6000,
			sticky: priority === 'urgent',
		});
	}

	togglePanel(): void {
		this.context.togglePanel();
	}

	// Context menu methods
	onContextMenu(event: MouseEvent): void {
		event.preventDefault();
		this.contextMenuPosition = { x: event.clientX, y: event.clientY };
		this.showContextMenu = true;
	}

	@HostListener('document:click')
	onDocumentClick(): void {
		this.showContextMenu = false;
	}

	closeContextMenu(): void {
		this.showContextMenu = false;
	}
}
// #endregion
