import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { EstadisticasDia } from '@core/services';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Componente presentacional para mostrar las estadísticas del día.
 * Usado por el Director para ver un resumen rápido.
 */
@Component({
	selector: 'app-estadisticas-dia',
	standalone: true,
	imports: [DatePipe, DecimalPipe, ButtonModule, TooltipModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estadisticas-dia.componente.html',
	styleUrls: ['./estadisticas-dia.component.scss'],
})
export class EstadisticasDiaComponent {
	estadisticas = input.required<EstadisticasDia | null>();
	downloadingPdf = input<boolean>(false);

	descargarPdf = output<void>();

	onDescargarPdf(): void {
		this.descargarPdf.emit();
	}
}
