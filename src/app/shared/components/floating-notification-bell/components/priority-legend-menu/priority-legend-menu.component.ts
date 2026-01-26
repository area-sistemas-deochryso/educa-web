import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationPriority } from '@core/services';

export interface PriorityInfo {
	priority: NotificationPriority;
	label: string;
	description: string;
	color: string;
}

@Component({
	selector: 'app-priority-legend-menu',
	imports: [CommonModule],
	templateUrl: './priority-legend-menu.component.html',
	styleUrl: './priority-legend-menu.component.scss',
})
export class PriorityLegendMenuComponent {
	@Input() show = false;
	@Input() position = { x: 0, y: 0 };
	@Input({ required: true }) priorityLegend!: PriorityInfo[];

	@Output() closeMenu = new EventEmitter<void>();

	onClose(): void {
		this.closeMenu.emit();
	}

	onMenuClick(event: Event): void {
		event.stopPropagation();
	}
}
