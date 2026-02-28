// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
/**
 * Evaluation summary item.
 */
export interface Evaluation {
	/** Evaluation name. */
	name: string;
	/** Numeric grade value. */
	grade: number;
}

@Component({
	selector: 'app-evaluations-accordion',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	templateUrl: './evaluations-accordion.component.html',
	styleUrls: ['./evaluations-accordion.component.scss'],
})
/**
 * Accordion list of evaluations for a course.
 */
export class EvaluationsAccordionComponent {
	// #region Inputs/Outputs
	/** True when the accordion is expanded. */
	@Input() expanded = false;
	/** List of evaluation items. */
	@Input() evaluations: Evaluation[] = [];
	/** Emits when the accordion header is clicked. */
	@Output() toggleTriggered = new EventEmitter<void>();
	// #endregion
}
// #endregion
