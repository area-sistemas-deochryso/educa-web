// #region Imports
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
@Component({
	selector: 'app-student-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	templateUrl: './student-card.component.html',
	styleUrl: './student-card.component.scss',
})
/**
 * Small card for a student name display.
 */
export class StudentCardComponent {
	// #region Inputs
	/** Last name or family name. */
	@Input() lastName = '';
	/** First name or given name. */
	@Input() firstName = '';
	// #endregion
}
// #endregion
