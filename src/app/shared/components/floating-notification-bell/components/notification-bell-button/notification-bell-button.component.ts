// #region Imports
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
	PriorityLegendMenuComponent,
	PriorityInfo,
} from '../priority-legend-menu/priority-legend-menu.component';
import { NotificationsPanelContext } from '../../notifications-panel.context';

// #endregion
// #region Implementation
@Component({
	selector: 'app-notification-bell-button',
	imports: [CommonModule, PriorityLegendMenuComponent],
	templateUrl: './notification-bell-button.component.html',
	styleUrl: './notification-bell-button.component.scss',
})
export class NotificationBellButtonComponent {
	// * Shared context for unread count + badge styling.
	private context = inject(NotificationsPanelContext);

	// * From context.
	unreadCount = this.context.unreadCount;
	badgePriorityClass = this.context.badgePriorityClass;

	// * Local state from parent (context menu is managed at floating-notification-bell level).
	@Input() showContextMenu = false;
	@Input() contextMenuPosition = { x: 0, y: 0 };
	@Input({ required: true }) priorityLegend!: PriorityInfo[];

	// * UI events forwarded to the container.
	@Output() togglePanel = new EventEmitter<void>();
	@Output() contextMenu = new EventEmitter<MouseEvent>();
	@Output() closeContextMenu = new EventEmitter<void>();

	onTogglePanel(): void {
		this.togglePanel.emit();
	}

	onContextMenu(event: MouseEvent): void {
		this.contextMenu.emit(event);
	}

	onCloseContextMenu(): void {
		this.closeContextMenu.emit();
	}
}
// #endregion
