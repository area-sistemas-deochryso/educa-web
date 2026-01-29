import { ChangeDetectionStrategy, Component, input, output, ViewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { EstadisticasDia } from '@core/services';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Componente presentacional para mostrar las estadísticas del día.
 * Usado por el Director para ver un resumen rápido.
 */
@Component({
	selector: 'app-estadisticas-dia',
	standalone: true,
	imports: [DatePipe, DecimalPipe, ButtonModule, TooltipModule, MenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estadisticas-dia.componente.html',
	styleUrls: ['./estadisticas-dia.component.scss'],
})
export class EstadisticasDiaComponent {
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	estadisticas = input.required<EstadisticasDia | null>();
	downloadingPdf = input<boolean>(false);

	verPdf = output<void>();
	descargarPdf = output<void>();

	readonly menuItems: MenuItem[] = [
		{
			label: 'Ver PDF',
			icon: 'pi pi-eye',
			command: () => this.onVerPdf(),
		},
		{
			label: 'Descargar PDF',
			icon: 'pi pi-download',
			command: () => this.onDescargarPdf(),
		},
	];

	toggleMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	onVerPdf(): void {
		this.verPdf.emit();
	}

	onDescargarPdf(): void {
		this.descargarPdf.emit();
	}
}
