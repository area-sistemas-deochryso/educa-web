import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-week-content-row',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './week-content-row.component.html',
	styleUrls: ['./week-content-row.component.scss'],
})
export class WeekContentRowComponent {
	@Input() icon = 'pi-file';
	@Input() title = '';
	@Input() subtitle = '';
	@Input() actionLabel = 'Ver';
	@Output() action = new EventEmitter<void>();
}
