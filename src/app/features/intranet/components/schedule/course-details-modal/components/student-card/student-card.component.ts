// #region Imports
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
@Component({
	selector: 'app-student-card',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './student-card.component.html',
	styleUrl: './student-card.component.scss',
})
export class StudentCardComponent {
	// * Name parts used for display formatting.
	@Input() lastName = '';
	@Input() firstName = '';

}
// #endregion
