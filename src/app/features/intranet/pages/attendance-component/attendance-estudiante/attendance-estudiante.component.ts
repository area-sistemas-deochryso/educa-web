// #region Imports
import { AsistenciaService } from '@core/services';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTable } from '../models/attendance.types';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { AuthStore } from '@core/store';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// #endregion
// #region Implementation
@Component({
	selector: 'app-attendance-estudiante',
	standalone: true,
	imports: [AttendanceTableComponent, EmptyStateComponent, AttendanceLegendComponent],
	templateUrl: './attendance-estudiante.component.html',
})
export class AttendanceEstudianteComponent implements OnInit {
	private asistenciaService = inject(AsistenciaService);
	private attendanceDataService = inject(AttendanceDataService);
	private authStore = inject(AuthStore);
	private destroyRef = inject(DestroyRef);

	// * Prefer full name; fallback keeps UI stable if profile is missing.
	private readonly userName = computed(
		() => this.authStore.user()?.nombreCompleto ?? 'Estudiante',
	);

	// * Student view uses personalized table titles.
	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Mis Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Mis Salidas'),
	);
	readonly loading = signal(false);
	readonly hasData = signal(false);

	ngOnInit(): void {
		// * Initial load uses the current month.
		this.loadAsistencias();
	}

	private loadAsistencias(): void {
		// * Default to current month/year on first render.
		const now = new Date();
		const currentMonth = now.getMonth() + 1;
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
					// * Map raw asistencia rows into table-friendly structures.
					const { ingresos, salidas } = this.attendanceDataService.processAsistencias(
						resumen.detalle,
						currentMonth,
						currentYear,
						this.userName(),
					);
					this.ingresos.set(ingresos);
					this.salidas.set(salidas);
				} else {
					this.hasData.set(false);
					// * Reset tables when no data is returned.
					this.ingresos.set(this.attendanceDataService.createEmptyTable('Mis Ingresos'));
					this.salidas.set(this.attendanceDataService.createEmptyTable('Mis Salidas'));
				}
			});
	}

	onIngresosMonthChange(month: number): void {
		const currentYear = this.ingresos().selectedYear;

		// * Fetch only the requested month; keep salidas unless same month.
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
						this.userName(),
					);
					this.ingresos.set(ingresos);
					// Salidas mantienen su mes actual
					const currentSalidasMonth = this.salidas().selectedMonth;
					if (currentSalidasMonth === month) {
						this.salidas.set(salidas);
					}
				} else {
					this.hasData.set(false);
					// * Clear only ingresos table on empty response.
					this.ingresos.set(this.attendanceDataService.createEmptyTable('Mis Ingresos'));
				}
			});
	}

	onSalidasMonthChange(month: number): void {
		const currentYear = this.salidas().selectedYear;

		// * Fetch only the requested month; keep ingresos unless same month.
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
						this.userName(),
					);
					this.salidas.set(salidas);
					// Ingresos mantienen su mes actual
					const currentIngresosMonth = this.ingresos().selectedMonth;
					if (currentIngresosMonth === month) {
						this.ingresos.set(ingresos);
					}
				} else {
					this.hasData.set(false);
					// * Clear only salidas table on empty response.
					this.salidas.set(this.attendanceDataService.createEmptyTable('Mis Salidas'));
				}
			});
	}

	reload(): void {
		this.loadAsistencias();
	}
}
// #endregion
