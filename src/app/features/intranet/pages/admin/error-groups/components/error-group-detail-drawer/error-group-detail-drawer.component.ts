import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	ESTADO_LABEL_MAP,
	ESTADO_SEVERITY_MAP,
	ESTADO_TRANSITIONS_MAP,
	ErrorGroupDetalle,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorOrigen,
	ErrorSeveridad,
	OcurrenciaLista,
	ORIGEN_ICON_MAP,
	ORIGEN_LABEL_MAP,
	SEVERIDAD_SEVERITY_MAP,
} from '../../models';

interface DrawerVm {
	visible: boolean;
	group: ErrorGroupLista | null;
	detalle: ErrorGroupDetalle | null;
	detalleLoading: boolean;
	ocurrencias: OcurrenciaLista[];
	ocurrenciasLoading: boolean;
	ocurrenciasPage: number;
	ocurrenciasPageSize: number;
	ocurrenciasTotal: number;
}

/**
 * Drawer del grupo de errores. Muestra metadata + listado paginado de
 * ocurrencias en dos tabs (Resumen / Ocurrencias).
 *
 * Click en una fila de ocurrencia → emite `occurrenceSelected` para que el
 * componente padre abra el sub-drawer.
 *
 * Footer con botones de transición filtrados según `ESTADO_TRANSITIONS_MAP`
 * (defensa en profundidad — el BE también valida).
 */
@Component({
	selector: 'app-error-group-detail-drawer',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		DatePipe,
		ButtonModule,
		DrawerModule,
		PaginatorModule,
		TableModule,
		TabsModule,
		TagModule,
		TooltipModule,
	],
	templateUrl: './error-group-detail-drawer.component.html',
	styleUrl: './error-group-detail-drawer.component.scss',
})
export class ErrorGroupDetailDrawerComponent {
	// #region Inputs / Outputs
	readonly visible = input<boolean>(false);
	readonly group = input<ErrorGroupLista | null>(null);
	readonly detalle = input<ErrorGroupDetalle | null>(null);
	readonly detalleLoading = input<boolean>(false);
	readonly ocurrencias = input<OcurrenciaLista[]>([]);
	readonly ocurrenciasLoading = input<boolean>(false);
	readonly ocurrenciasPage = input<number>(1);
	readonly ocurrenciasPageSize = input<number>(20);

	readonly visibleChange = output<boolean>();
	readonly occurrenceSelected = output<OcurrenciaLista>();
	readonly statusChangeRequested = output<ErrorGroupLista>();
	readonly ocurrenciasPageChange = output<{ page: number; pageSize: number }>();
	// #endregion

	// #region Maps
	readonly severidadSeverity = SEVERIDAD_SEVERITY_MAP;
	readonly origenIcon = ORIGEN_ICON_MAP;
	readonly origenLabel = ORIGEN_LABEL_MAP;
	readonly estadoLabel = ESTADO_LABEL_MAP;
	readonly estadoSeverity = ESTADO_SEVERITY_MAP;
	// #endregion

	// #region ViewModel
	readonly vm = computed<DrawerVm>(() => {
		const grp = this.group();
		const det = this.detalle();
		const ocurrencias = this.ocurrencias();
		return {
			visible: this.visible(),
			group: grp,
			detalle: det,
			detalleLoading: this.detalleLoading(),
			ocurrencias,
			ocurrenciasLoading: this.ocurrenciasLoading(),
			ocurrenciasPage: this.ocurrenciasPage(),
			ocurrenciasPageSize: this.ocurrenciasPageSize(),
			ocurrenciasTotal: det?.totalOcurrencias ?? grp?.contadorTotal ?? 0,
		};
	});

	readonly paginatorFirst = computed(
		() => (this.ocurrenciasPage() - 1) * this.ocurrenciasPageSize(),
	);

	/**
	 * Botones de transición a renderizar en el footer (excluyendo el estado
	 * actual). Si el grupo no está cargado, vacío.
	 */
	readonly transitionButtons = computed<ErrorGroupEstado[]>(() => {
		const grp = this.group();
		if (!grp) return [];
		return ESTADO_TRANSITIONS_MAP[grp.estado] ?? [];
	});
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onOccurrenceClick(item: OcurrenciaLista): void {
		this.occurrenceSelected.emit(item);
	}

	onStatusChangeClick(): void {
		const grp = this.group();
		if (grp) this.statusChangeRequested.emit(grp);
	}

	onOcurrenciasPageChange(event: PaginatorState): void {
		this.ocurrenciasPageChange.emit({
			page: (event.page ?? 0) + 1,
			pageSize: event.rows ?? this.ocurrenciasPageSize(),
		});
	}
	// #endregion

	// #region Helpers visuales
	getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return this.severidadSeverity[severidad as ErrorSeveridad] ?? 'info';
	}

	getOrigenIcon(origen: string): string {
		return this.origenIcon[origen as ErrorOrigen] ?? 'pi pi-question';
	}

	getEstadoLabel(estado: string): string {
		return this.estadoLabel[estado as ErrorGroupEstado] ?? estado;
	}

	getEstadoSeverity(
		estado: string,
	): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
		return this.estadoSeverity[estado as ErrorGroupEstado] ?? 'secondary';
	}
	// #endregion
}
