// #region Imports
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
export interface UnreadByPriority {
	urgent: number;
	high: number;
	medium: number;
	low: number;
}

@Component({
	selector: 'app-priority-summary',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	templateUrl: './priority-summary.component.html',
	styleUrl: './priority-summary.component.scss',
})
export class PrioritySummaryComponent {
	// * Counts by priority for the header summary pills.
	@Input({ required: true }) unreadByPriority!: UnreadByPriority;
}
// #endregion
