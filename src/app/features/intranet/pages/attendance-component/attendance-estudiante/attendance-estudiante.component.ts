import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AsistenciaService, StorageService } from '@core/services';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';
import { AttendanceTable } from '../models/attendance.types';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';

@Component({
	selector: 'app-attendance-estudiante',
	standalone: true,
	imports: [AttendanceTableComponent, EmptyStateComponent],
	templateUrl: './attendance-estudiante.component.html',
})
export class AttendanceEstudianteComponent implements OnInit {
	private asistenciaService = inject(AsistenciaService);
	private storageService = inject(StorageService);
	private attendanceDataService = inject(AttendanceDataService);
	private destroyRef = inject(DestroyRef);

	readonly ingresos = signal<AttendanceTable>(this.attendanceDataService.createEmptyTable());
	readonly salidas = signal<AttendanceTable>(this.attendanceDataService.createEmptyTable());
	readonly loading = signal(false);
	readonly hasData = signal(false);

	ngOnInit(): void {
		this.loadAsistencias();
	}

	private loadAsistencias(): void {
		// Restaurar mes guardado o usar mes actual
		const savedMonth = this.storageService.getAttendanceMonth();
		const now = new Date();
		const currentMonth = savedMonth ?? now.getMonth() + 1;
		const currentYear = now.getFullYear();

		this.loading.set(true);

		this.asistenciaService
			.getMisAsistencias(currentMonth, currentYear)
			.pipe(
				finalize(() => this.loading.set(false)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((resumen) => {
				if (resumen && resumen.detalle && resumen.detalle.length > 0) {
					this.hasData.set(true);
					const { ingresos, salidas } = this.attendanceDataService.processAsistencias(
						resumen.detalle,
						currentMonth,
						currentYear,
					);
					this.ingresos.set(ingresos);
					this.salidas.set(salidas);
				} else {
					this.hasData.set(false);
					this.ingresos.set(this.attendanceDataService.createEmptyTable());
					this.salidas.set(this.attendanceDataService.createEmptyTable());
				}
			});
	}

	onIngresosMonthChange(month: number): void {
		const currentYear = this.ingresos().selectedYear;

		// Guardar mes seleccionado
		this.storageService.setAttendanceMonth(month);

		this.loading.set(true);

		this.asistenciaService
			.getMisAsistencias(month, currentYear)
			.pipe(
				finalize(() => this.loading.set(false)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((resumen) => {
				if (resumen && resumen.detalle && resumen.detalle.length > 0) {
					this.hasData.set(true);
					const { ingresos, salidas } = this.attendanceDataService.processAsistencias(
						resumen.detalle,
						month,
						currentYear,
					);
					this.ingresos.set(ingresos);
					// Salidas mantienen su mes actual
					const currentSalidasMonth = this.salidas().selectedMonth;
					if (currentSalidasMonth === month) {
						this.salidas.set(salidas);
					}
				} else {
					this.hasData.set(false);
					this.ingresos.set(this.attendanceDataService.createEmptyTable());
				}
			});
	}

	onSalidasMonthChange(month: number): void {
		const currentYear = this.salidas().selectedYear;

		// Guardar mes seleccionado
		this.storageService.setAttendanceMonth(month);

		this.loading.set(true);

		this.asistenciaService
			.getMisAsistencias(month, currentYear)
			.pipe(
				finalize(() => this.loading.set(false)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((resumen) => {
				if (resumen && resumen.detalle && resumen.detalle.length > 0) {
					this.hasData.set(true);
					const { ingresos, salidas } = this.attendanceDataService.processAsistencias(
						resumen.detalle,
						month,
						currentYear,
					);
					this.salidas.set(salidas);
					// Ingresos mantienen su mes actual
					const currentIngresosMonth = this.ingresos().selectedMonth;
					if (currentIngresosMonth === month) {
						this.ingresos.set(ingresos);
					}
				} else {
					this.hasData.set(false);
					this.salidas.set(this.attendanceDataService.createEmptyTable());
				}
			});
	}

	reload(): void {
		this.loadAsistencias();
	}
}
