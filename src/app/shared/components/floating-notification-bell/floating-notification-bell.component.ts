import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
	NotificationsService,
	SeasonalNotification,
	NotificationPriority,
	KeyboardShortcutsService,
} from '@core/services';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface PriorityInfo {
	priority: NotificationPriority;
	label: string;
	description: string;
	color: string;
}

const PRIORITY_LEGEND: PriorityInfo[] = [
	{
		priority: 'urgent',
		label: 'Urgente',
		description: 'Requiere atención inmediata. Fechas límite próximas o vencidas.',
		color: '#dc2626',
	},
	{
		priority: 'high',
		label: 'Importante',
		description: 'Alta prioridad. Acciones pendientes que requieren atención pronto.',
		color: '#ffcc0c',
	},
	{
		priority: 'medium',
		label: 'Normal',
		description: 'Prioridad estándar. Información relevante para tu día a día.',
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
	imports: [CommonModule, RouterLink, ToastModule],
	providers: [MessageService],
	templateUrl: './floating-notification-bell.component.html',
	styleUrl: './floating-notification-bell.component.scss',
})
export class FloatingNotificationBellComponent implements OnInit, OnDestroy {
	private notificationsService = inject(NotificationsService);
	private keyboardService = inject(KeyboardShortcutsService);
	private messageService = inject(MessageService);

	notifications = this.notificationsService.activeNotifications;
	hasNotifications = this.notificationsService.hasUnread;
	notificationCount = this.notificationsService.count;
	unreadCount = this.notificationsService.unreadCount;
	isPanelOpen = this.notificationsService.isPanelOpen;
	unreadByPriority = this.notificationsService.unreadByPriority;
	highestPriority = this.notificationsService.highestPriority;
	dismissedNotifications = this.notificationsService.dismissedNotifications;
	dismissedCount = this.notificationsService.dismissedCount;
	showDismissedHistory = this.notificationsService.showDismissedHistory;

	// Context menu
	showContextMenu = false;
	contextMenuPosition = { x: 0, y: 0 };
	priorityLegend = PRIORITY_LEGEND;

	private hasShownToast = false;

	ngOnInit(): void {
		// Registrar atajo de teclado para abrir/cerrar panel de notificaciones
		this.keyboardService.register('toggle-notification-bell', () => {
			this.notificationsService.togglePanel();
		});

		// Mostrar toast de PrimeNG si hay notificaciones urgentes o importantes
		setTimeout(() => {
			if (this.unreadCount() > 0 && !this.hasShownToast) {
				this.showNotificationToast();
				this.hasShownToast = true;
			}
		}, 500);
	}

	ngOnDestroy(): void {
		this.keyboardService.unregister('toggle-notification-bell');
		this.notificationsService.closePanel();
	}

	/**
	 * Muestra un toast de PrimeNG para notificaciones importantes
	 */
	private showNotificationToast(): void {
		const priority = this.highestPriority();
		const count = this.unreadCount();

		if (!priority) return;

		// Reproducir sonido
		this.notificationsService.playSound();

		const severityMap: Record<NotificationPriority, string> = {
			urgent: 'error',
			high: 'warn',
			medium: 'info',
			low: 'success',
		};

		const titleMap: Record<NotificationPriority, string> = {
			urgent: 'Notificación Urgente',
			high: 'Notificación Importante',
			medium: 'Nueva Notificación',
			low: 'Información',
		};

		this.messageService.add({
			severity: severityMap[priority],
			summary: titleMap[priority],
			detail: `Tienes ${count} notificación${count > 1 ? 'es' : ''} sin leer. Haz clic en la campana para verlas.`,
			life: 6000,
			sticky: priority === 'urgent',
		});
	}

	togglePanel(): void {
		this.notificationsService.togglePanel();
	}

	dismissNotification(id: string): void {
		this.notificationsService.dismiss(id);
	}

	dismissAll(): void {
		this.notificationsService.dismissAll();
	}

	restoreNotification(id: string): void {
		this.notificationsService.restore(id);
	}

	restoreAll(): void {
		this.notificationsService.restoreAll();
	}

	toggleDismissedHistory(): void {
		this.notificationsService.toggleDismissedHistory();
	}

	markAsRead(id: string): void {
		this.notificationsService.markAsRead(id);
	}

	markAllAsRead(): void {
		this.notificationsService.markAllAsRead();
	}

	isRead(id: string): boolean {
		return this.notificationsService.isRead(id);
	}

	getPriorityClass(priority: string): string {
		return `notification-${priority}`;
	}

	/**
	 * Obtiene la clase de color del badge según la prioridad más alta
	 */
	getBadgePriorityClass(): string {
		const priority = this.highestPriority();
		if (!priority) return '';
		return `badge-${priority}`;
	}

	getTypeIcon(type: string): string {
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
		const labels: Record<string, string> = {
			matricula: 'Matrícula',
			pago: 'Pago',
			academico: 'Académico',
			festividad: 'Festividad',
			evento: 'Evento',
		};
		return labels[type] || type;
	}

	trackById(_index: number, notification: SeasonalNotification): string {
		return notification.id;
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
