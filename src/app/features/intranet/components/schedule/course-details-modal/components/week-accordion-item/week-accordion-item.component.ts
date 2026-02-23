// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { WeekContentRowComponent } from '../week-content-row/week-content-row.component';

// #endregion
// #region Implementation
export interface WeekData {
	id: number;
	name: string;
	expanded: boolean;
	teacherMessage: string;
	attachments: { count: number; unread: number; reviewed: number };
	pendingTasks: { count: number; unread: number };
	submittedTasks: { count: number; unread: number; reviewed: number };
}

@Component({
	selector: 'app-week-accordion-item',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, WeekContentRowComponent],
	templateUrl: './week-accordion-item.component.html',
	styleUrls: ['./week-accordion-item.component.scss'],
})
export class WeekAccordionItemComponent {
	// * Inputs/outputs for accordion behavior and actions.
	@Input({ required: true }) week!: WeekData;
	@Output() toggleTriggered = new EventEmitter<void>();
	@Output() openAttachments = new EventEmitter<void>();
	@Output() openTasks = new EventEmitter<void>();
	@Output() openSubmissions = new EventEmitter<void>();
}
// #endregion
