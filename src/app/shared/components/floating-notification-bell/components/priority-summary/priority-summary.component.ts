import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UnreadByPriority {
	urgent: number;
	high: number;
	medium: number;
	low: number;
}

@Component({
	selector: 'app-priority-summary',
	imports: [CommonModule],
	templateUrl: './priority-summary.component.html',
	styleUrl: './priority-summary.component.scss',
})
export class PrioritySummaryComponent {
	@Input({ required: true }) unreadByPriority!: UnreadByPriority;
}
