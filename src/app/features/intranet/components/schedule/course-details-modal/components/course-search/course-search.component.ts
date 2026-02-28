// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// #endregion
// #region Implementation
@Component({
	selector: 'app-course-search',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule],
	templateUrl: './course-search.component.html',
	styleUrls: ['./course-search.component.scss'],
})
/**
 * Search input with dropdown results for courses.
 */
export class CourseSearchComponent {
	// #region Inputs
	/** Current search term value. */
	@Input() searchTerm = '';
	/** Placeholder text for the input. */
	@Input() placeholder = 'Ingrese nombre curso';
	/** List of results to display. */
	@Input() results: string[] = [];
	/** True when the dropdown should be visible. */
	@Input() showDropdown = false;
	// #endregion

	// #region Outputs
	/** Emits when the search term changes. */
	@Output() searchTermChange = new EventEmitter<string>();
	/** Emits when a search should run. */
	@Output() searchTriggered = new EventEmitter<void>();
	/** Emits when the input loses focus. */
	@Output() blurTriggered = new EventEmitter<void>();
	/** Emits when a result is selected. */
	@Output() selectTriggered = new EventEmitter<string>();
	// #endregion
}
// #endregion
