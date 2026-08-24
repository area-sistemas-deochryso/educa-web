// #region Imports
import { ChangeDetectionStrategy, Component, ViewChild, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { EstadisticasDia } from '@data/models';
import { EduMenu, EduTooltip } from '@edu-ui';
import type { EduMenuItem } from '@edu-ui';

/**
 * Componente presentacional para mostrar las estadísticas del día.
 * Usado por el Director para ver un resumen rápido.
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-estadisticas-dia',
	standalone: true,
	imports: [DatePipe, DecimalPipe, ButtonModule, EduTooltip, EduMenu],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estadisticas-dia.component.html',
	styleUrls: ['./estadisticas-dia.component.scss'],
})
export class EstadisticasDiaComponent {
	@ViewChild('pdfMenu') pdfMenu!: EduMenu;

	// * Inputs
	estadisticas = input.required<EstadisticasDia | null>();
	downloadingPdf = input<boolean>(false);

	// * Outputs for PDF + Excel actions
	verPdf = output<void>();
	descargarPdf = output<void>();
	descargarExcel = output<void>();

	readonly menuItems: EduMenuItem[] = [
		{
			label: 'Ver PDF',
			icon: 'pi pi-file-pdf',
			command: () => this.onVerPdf(),
		},
		{
			label: 'Descargar PDF',
			icon: 'pi pi-file-pdf',
			command: () => this.onDescargarPdf(),
		},
		{
			label: 'Descargar Excel',
			icon: 'pi pi-file-excel',
			command: () => this.onDescargarExcel(),
		}];

	toggleMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	onVerPdf(): void {
		this.verPdf.emit();
	}

	onDescargarPdf(): void {
		this.descargarPdf.emit();
	}

	onDescargarExcel(): void {
		this.descargarExcel.emit();
	}
}
// #endregion
