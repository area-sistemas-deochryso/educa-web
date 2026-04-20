import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { SkeletonColumnDef } from '@shared/components';
import { TableSkeletonComponent } from '@shared/components';
import { AttendanceStatus } from '@data/models/attendance.models';

import { AsistenciaPropiaFacade } from './services/asistencia-propia.facade';

/**
 * Vista self-service "Mi asistencia" para el profesor autenticado
 * (Plan 21 Chat 4).
 *
 * Read-only. Consume `/profesor/me/mes` — el backend extrae el DNI
 * del claim, no se expone como parámetro en el frontend.
 *
 * Navegación: mes anterior / mes actual / mes siguiente + selectores
 * explícitos de mes y año.
 */
@Component({
	selector: 'app-attendance-profesor-propia',
	standalone: true,
	imports: [
		ButtonModule,
		Select,
		TableModule,
		TagModule,
		TooltipModule,
		TableSkeletonComponent,
		FormsModule,
		DatePipe,
	],
	templateUrl: './attendance-profesor-propia.component.html',
	styleUrl: './attendance-profesor-propia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceProfesorPropiaComponent implements OnInit {
	readonly facade = inject(AsistenciaPropiaFacade);

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

	// #endregion
	// #region Lifecycle

	ngOnInit(): void {
		this.facade.loadMes();
	}

	// #endregion
	// #region Handlers

	onMesChange(mes: number): void {
		this.facade.setMes(mes);
	}

	onAnioChange(anio: number): void {
		this.facade.setAnio(anio);
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
