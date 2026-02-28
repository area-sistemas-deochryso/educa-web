// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// #endregion
// #region Implementation
@Component({
	selector: 'app-week-search-box',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule],
	templateUrl: './week-search-box.component.html',
	styleUrls: ['./week-search-box.component.scss'],
})
/**
 * Search box used to filter weeks or content.
 */
export class WeekSearchBoxComponent {
	// #region Inputs/Outputs
	/** Current search term value. */
	@Input() searchTerm = '';
	/** Placeholder text shown in the input. */
	@Input() placeholder = 'BUSCAR ARCHIVO, SEMANA O TEMA...';
	/** Emits when the search term changes. */
	@Output() searchTermChange = new EventEmitter<string>();
	// #endregion
}
// #endregion
