// #region Imports
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
@Component({
	selector: 'app-week-content-row',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './week-content-row.component.html',
	styleUrls: ['./week-content-row.component.scss'],
})
export class WeekContentRowComponent {
	// * Simple row with icon, text, and action link.
	@Input() icon = 'pi-file';
	@Input() title = '';
	@Input() subtitle = '';
	@Input() actionLabel = 'Ver';
	@Output() action = new EventEmitter<void>();
}
// #endregion
