// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
@Component({
	selector: 'app-week-content-row',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	templateUrl: './week-content-row.component.html',
	styleUrls: ['./week-content-row.component.scss'],
})
/**
 * Simple row with icon, text, and a single action trigger.
 */
export class WeekContentRowComponent {
	// #region Inputs/Outputs
	/** PrimeIcons class for the leading icon. */
	@Input() icon = 'pi-file';
	/** Main label text. */
	@Input() title = '';
	/** Secondary label text. */
	@Input() subtitle = '';
	/** Action button label. */
	@Input() actionLabel = 'Ver';
	/** Emits when the action is clicked. */
	@Output() action = new EventEmitter<void>();
	// #endregion
}
// #endregion
