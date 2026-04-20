import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AttendanceStatus } from '@data/models/attendance.models';
import { UiMappingService } from '@shared/services/ui-mapping/ui-mapping.service';

import { AsistenciaProfesorDataFacade } from './services/asistencia-profesor-data.facade';
import { AsistenciaProfesorUiFacade } from './services/asistencia-profesor-ui.facade';

interface EstadoOption {
	label: string;
	value: AttendanceStatus | null;
}

/**
 * Vista "Profesores" del panel admin de asistencia (Plan 21 Chat 3).
 *
 * Permite al administrativo (Director + 3 no-Director):
 * - Listar profesores con asistencias en un rango.
 * - Filtrar por estado (A/T/F/J).
 * - Ver detalle de un profesor en modo día o mes.
 * - Exportar PDFs (día, mes, filtrado).
 */
@Component({
	selector: 'app-attendance-director-profesores',
	standalone: true,
	imports: [
		ButtonModule,
		DatePickerModule,
		MenuModule,
		Select,
		SelectButton,
		TableModule,
		TagModule,
		TooltipModule,
		FormsModule,
		DatePipe,
		NgClass,
	],
	templateUrl: './attendance-director-profesores.component.html',
	styleUrl: './attendance-director-profesores.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorProfesoresComponent implements OnInit {
	readonly dataFacade = inject(AsistenciaProfesorDataFacade);
	readonly uiFacade = inject(AsistenciaProfesorUiFacade);
	readonly uiMapping = inject(UiMappingService);

	// #region Options

	readonly estadoOptions: EstadoOption[] = [
		{ label: 'Todos', value: null },
		{ label: 'Asistió (A)', value: 'A' },
		{ label: 'Tardanza (T)', value: 'T' },
		{ label: 'Falta (F)', value: 'F' },
		{ label: 'Justificado (J)', value: 'J' },
	];

	readonly viewModeOptions = [
		{ label: 'Día', value: 'dia' as const },
		{ label: 'Mes', value: 'mes' as const },
	];

	readonly mesOptions = [
		{ label: 'Enero', value: 1 },
		{ label: 'Febrero', value: 2 },
		{ label: 'Marzo', value: 3 },
		{ label: 'Abril', value: 4 },
		{ label: 'Mayo', value: 5 },
		{ label: 'Junio', value: 6 },
		{ label: 'Julio', value: 7 },
		{ label: 'Agosto', value: 8 },
		{ label: 'Septiembre', value: 9 },
		{ label: 'Octubre', value: 10 },
		{ label: 'Noviembre', value: 11 },
		{ label: 'Diciembre', value: 12 },
	];

	readonly anioOptions = [
		{ label: '2024', value: 2024 },
		{ label: '2025', value: 2025 },
		{ label: '2026', value: 2026 },
	];

	// #endregion
	// #region Computed

	readonly selectedProfesor = computed(() => {
		const dni = this.dataFacade.selectedProfesorDni();
		if (!dni) return null;
		return this.dataFacade.items().find((p) => p.dni === dni) ?? null;
	});

	readonly detalleAsistencias = computed(() => {
		return this.dataFacade.selectedProfesorDetalle()?.asistencias ?? [];
	});

	readonly pdfMenuItems = computed<MenuItem[]>(() => {
		const mode = this.uiFacade.viewMode();
		const hasProfesor = !!this.dataFacade.selectedProfesorDni();

		if (!hasProfesor) {
			return [
				{
					label: 'Ver reporte filtrado',
					icon: 'pi pi-eye',
					command: () => this.uiFacade.verPdfFiltrado(),
				},
				{
					label: 'Descargar reporte filtrado',
					icon: 'pi pi-download',
					command: () => this.uiFacade.descargarPdfFiltrado(),
				},
			];
		}

		if (mode === 'dia') {
			return [
				{
					label: 'Ver PDF (día)',
					icon: 'pi pi-eye',
					command: () => this.uiFacade.verPdfDia(),
				},
				{
					label: 'Descargar PDF (día)',
					icon: 'pi pi-download',
					command: () => this.uiFacade.descargarPdfDia(),
				},
				{ separator: true },
				{
					label: 'Ver reporte filtrado',
					icon: 'pi pi-eye',
					command: () => this.uiFacade.verPdfFiltrado(),
				},
				{
					label: 'Descargar reporte filtrado',
					icon: 'pi pi-download',
					command: () => this.uiFacade.descargarPdfFiltrado(),
				},
			];
		}

		return [
			{
				label: 'Ver PDF (mes)',
				icon: 'pi pi-eye',
				command: () => this.uiFacade.verPdfMes(),
			},
			{
				label: 'Descargar PDF (mes)',
				icon: 'pi pi-download',
				command: () => this.uiFacade.descargarPdfMes(),
			},
			{ separator: true },
			{
				label: 'Ver reporte filtrado',
				icon: 'pi pi-eye',
				command: () => this.uiFacade.verPdfFiltrado(),
			},
			{
				label: 'Descargar reporte filtrado',
				icon: 'pi pi-download',
				command: () => this.uiFacade.descargarPdfFiltrado(),
			},
		];
	});

	// #endregion
	// #region Lifecycle

	ngOnInit(): void {
		this.dataFacade.loadList();
	}

	// #endregion
	// #region Handlers

	onFechaInicioChange(fecha: Date): void {
		this.uiFacade.setFechaInicio(fecha);
	}

	onFechaFinChange(fecha: Date): void {
		this.uiFacade.setFechaFin(fecha);
	}

	onEstadoChange(estado: AttendanceStatus | null): void {
		this.uiFacade.setFilterEstado(estado);
	}

	onAplicarFiltros(): void {
		this.uiFacade.applyFilters();
	}

	onSelectProfesor(dni: string): void {
		this.uiFacade.selectProfesor(dni);
	}

	onClearSelection(): void {
		this.uiFacade.selectProfesor(null);
	}

	onViewModeChange(mode: 'dia' | 'mes'): void {
		this.uiFacade.setViewMode(mode);
	}

	onSelectedDateChange(fecha: Date): void {
		this.uiFacade.setSelectedDate(fecha);
	}

	onSelectedMesChange(mes: number): void {
		this.uiFacade.setSelectedMes(mes);
	}

	onSelectedAnioChange(anio: number): void {
		this.uiFacade.setSelectedAnio(anio);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		const first = event.first ?? 0;
		const pageSize = event.rows ?? this.dataFacade.pagination().pageSize;
		const page = Math.floor(first / pageSize) + 1;
		this.dataFacade.changePage(page, pageSize);
	}

	togglePdfMenu(event: Event, menu: Menu): void {
		menu.toggle(event);
	}

	// #endregion
	// #region Helpers de UI

	getEstadoSeverity(estado: AttendanceStatus): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
		switch (estado) {
			case 'A':
				return 'success';
			case 'T':
				return 'warn';
			case 'F':
				return 'danger';
			case 'J':
				return 'info';
			default:
				return 'secondary';
		}
	}

	// #endregion
}
