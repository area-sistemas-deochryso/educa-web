import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
	LEGEND_ITEMS,
	getStatusClass,
} from '@features/intranet/pages/attendance-component/attendance.config';

@Component({
	selector: 'app-attendance-legend',
	standalone: true,
	templateUrl: './attendance-legend.component.html',
	styleUrl: './attendance-legend.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceLegendComponent {
	legendItems = LEGEND_ITEMS;

	getStatusClass = getStatusClass;
}
