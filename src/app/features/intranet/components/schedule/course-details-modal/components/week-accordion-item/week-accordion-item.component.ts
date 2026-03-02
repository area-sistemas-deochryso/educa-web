// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { WeekContentRowComponent } from '../week-content-row/week-content-row.component';

// #endregion
// #region Implementation
/**
 * Week data displayed in the accordion.
 */
export interface WeekData {
	/** Week id. */
	id: number;
	/** Week label. */
	name: string;
	/** True when the week is expanded. */
	expanded: boolean;
	/** Teacher message shown in the details. */
	teacherMessage: string;
	/** Attachment counters. */
	attachments: { count: number; unread: number; reviewed: number };
	/** Pending task counters. */
	pendingTasks: { count: number; unread: number };
	/** Submitted task counters. */
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
/**
 * Accordion item representing a single week.
 */
export class WeekAccordionItemComponent {
	// #region Inputs/Outputs
	/** Week data to render. */
	@Input({ required: true }) week!: WeekData;
	/** Emits when the accordion header is toggled. */
	@Output() toggleTriggered = new EventEmitter<void>();
	/** Emits when attachments action is selected. */
	@Output() openAttachments = new EventEmitter<void>();
	/** Emits when tasks action is selected. */
	@Output() openTasks = new EventEmitter<void>();
	/** Emits when submissions action is selected. */
	@Output() openSubmissions = new EventEmitter<void>();
	// #endregion
}
// #endregion
