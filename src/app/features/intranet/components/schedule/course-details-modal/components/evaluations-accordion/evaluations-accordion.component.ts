// #region Imports
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
export interface Evaluation {
	name: string;
	grade: number;
}

@Component({
	selector: 'app-evaluations-accordion',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './evaluations-accordion.component.html',
	styleUrls: ['./evaluations-accordion.component.scss'],
})
export class EvaluationsAccordionComponent {
	// * Expanded state + list of evaluations.
	@Input() expanded = false;
	@Input() evaluations: Evaluation[] = [];
	@Output() toggleTriggered = new EventEmitter<void>();
}
// #endregion
