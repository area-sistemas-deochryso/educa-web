import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ReporteFiltrado } from '../../models';

@Component({
	selector: 'app-reportes-resumen',
	standalone: true,
	templateUrl: './reportes-resumen.component.html',
	styleUrl: './reportes-resumen.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesResumenComponent {
	readonly resultado = input.required<ReporteFiltrado>();
}
