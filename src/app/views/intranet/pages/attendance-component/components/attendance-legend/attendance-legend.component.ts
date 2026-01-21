import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LEGEND_ITEMS, getStatusClass } from '../../attendance.config';

@Component({
	selector: 'app-attendance-legend',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './attendance-legend.component.html',
	styleUrl: './attendance-legend.component.scss',
})
export class AttendanceLegendComponent {
	legendItems = LEGEND_ITEMS;

	getStatusClass = getStatusClass;
}
