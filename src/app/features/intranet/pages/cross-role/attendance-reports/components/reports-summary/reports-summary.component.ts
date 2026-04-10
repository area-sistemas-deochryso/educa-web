import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ReporteFiltrado } from '../../models';

@Component({
	selector: 'app-reports-summary',
	standalone: true,
	templateUrl: './reports-summary.component.html',
	styleUrl: './reports-summary.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsSummaryComponent {
	readonly resultado = input.required<ReporteFiltrado>();
}
