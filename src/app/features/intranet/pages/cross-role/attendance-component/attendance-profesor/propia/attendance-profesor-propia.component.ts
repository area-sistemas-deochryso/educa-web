import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { SkeletonColumnDef } from '@shared/components';
import { TableSkeletonComponent } from '@shared/components';
import { AttendanceStatus } from '@data/models/attendance.models';
import { AttendanceLegendComponent } from '@features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import {
	VIEW_MODE,
	ViewMode,
} from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

import { AsistenciaPropiaFacade } from './services/asistencia-propia.facade';

/**
 * Vista self-service "Mi asistencia" para el profesor autenticado
 * (Plan 21 Chat 4 + Chat 6 modo día/mes + leyenda compartida).
 *
 * Read-only. Consume `/profesor/me/mes` y `/profesor/me/dia` — el backend
 * extrae el DNI del claim, no se expone como parámetro en el frontend.
 *
 * Modos:
 * - `mes` (default): lista de todas las asistencias del mes seleccionado.
 * - `dia`: detalle de una fecha puntual (picker de calendario).
 */
@Component({
	selector: 'app-attendance-profesor-propia',
	standalone: true,
	imports: [
		ButtonModule,
		DatePickerModule,
		Select,
		TableModule,
		TagModule,
		TooltipModule,
		TableSkeletonComponent,
		AttendanceLegendComponent,
		FormsModule,
		DatePipe,
	],
	templateUrl: './attendance-profesor-propia.component.html',
	styleUrl: './attendance-profesor-propia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceProfesorPropiaComponent implements OnInit {
	readonly facade = inject(AsistenciaPropiaFacade);

	// #region Constantes / Modos

	readonly VIEW_MODE = VIEW_MODE;

	// #endregion
	// #region Opciones de UI

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

	readonly anioOptions = computed(() => {
		const currentYear = new Date().getFullYear();
		// Ventana de 3 años hacia atrás + año actual
		return [currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map((y) => ({
			label: y.toString(),
			value: y,
		}));
	});

	readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '140px', cellType: 'text' },
		{ width: '110px', cellType: 'text' },
		{ width: '110px', cellType: 'text' },
		{ width: '100px', cellType: 'badge' },
		{ width: 'flex', cellType: 'text' },
	];

	readonly isCurrentMonth = computed(() => this.facade.isCurrentMonth());
	readonly isDiaMode = computed(() => this.facade.viewMode() === VIEW_MODE.Dia);
	readonly today = new Date();

	// #endregion
	// #region Lifecycle

	ngOnInit(): void {
		this.facade.load();
	}

	// #endregion
	// #region Handlers — API pública para el shell (setViewMode)

	/**
	 * Llamado por el shell `AttendanceProfesorComponent` cuando el usuario
	 * cambia el pill día/mes del header compartido.
	 */
	setViewMode(mode: ViewMode): void {
		this.facade.setViewMode(mode);
	}

	// #endregion
	// #region Handlers — UI local

	onMesChange(mes: number): void {
		this.facade.setMes(mes);
	}

	onAnioChange(anio: number): void {
		this.facade.setAnio(anio);
	}

	onDateChange(date: Date | null): void {
		if (date) this.facade.setDate(date);
	}

	onPrevMonth(): void {
		this.facade.prevMonth();
	}

	onNextMonth(): void {
		this.facade.nextMonth();
	}

	onGoToCurrent(): void {
		this.facade.goToCurrent();
	}

	onRefresh(): void {
		this.facade.refresh();
	}

	// #endregion
	// #region Helpers UI

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
