import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	inject,
	signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';
import { AttendanceLegendComponent } from '@features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from '@features/intranet/components/attendance/attendance-table/attendance-table.component';
import { EmptyStateComponent } from '@features/intranet/components/attendance/empty-state/empty-state.component';
import { AttendanceTable } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import { AsistenciaProfesorApiService } from '@shared/services/attendance';
import { logger } from '@core/helpers';

/**
 * Vista "Mi asistencia" del profesor autenticado (Plan 21 Chat 6).
 *
 * Diseño **idéntico** a `AttendanceEstudianteComponent`: leyenda + 2 tablas
 * mensuales (ingresos y salidas) con el calendario `AttendanceTableComponent`.
 * No soporta modo día — el pill día/mes del header cross-role no aplica
 * (igual que no aplica a la vista del estudiante viendo su propia asistencia).
 *
 * Consume `/profesor/me/mes` del backend. El DNI se extrae del claim en el
 * backend, no se expone al frontend.
 */
@Component({
	selector: 'app-attendance-profesor-propia',
	standalone: true,
	imports: [AttendanceLegendComponent, AttendanceTableComponent, EmptyStateComponent],
	templateUrl: './attendance-profesor-propia.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceProfesorPropiaComponent implements OnInit {
	private readonly api = inject(AsistenciaProfesorApiService);
	private readonly attendanceDataService = inject(AttendanceDataService);
	private readonly destroyRef = inject(DestroyRef);

	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Mis Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Mis Salidas'),
	);
	readonly loading = signal(false);
	readonly hasData = signal(false);

	// * Nombre resuelto desde el backend (`AsistenciaProfesorDto.nombreCompleto`)
	//   — se actualiza en la primera respuesta. Hasta entonces se usa el fallback.
	private readonly profesorNombre = signal<string>('Profesor');

	ngOnInit(): void {
		const now = new Date();
		this.loadAsistencias(now.getMonth() + 1, now.getFullYear(), 'ingresos');
	}

	onIngresosMonthChange(month: number): void {
		this.loadAsistencias(month, this.ingresos().selectedYear, 'ingresos');
	}

	onSalidasMonthChange(month: number): void {
		this.loadAsistencias(month, this.salidas().selectedYear, 'salidas');
	}

	reload(): void {
		const now = new Date();
		this.loadAsistencias(now.getMonth() + 1, now.getFullYear(), 'ingresos');
	}

	private loadAsistencias(month: number, year: number, target: 'ingresos' | 'salidas'): void {
		this.loading.set(true);

		this.api
			.obtenerMiAsistenciaMes(month, year)
			.pipe(
				finalize(() => this.loading.set(false)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (response) => {
					if (!response) {
						this.hasData.set(false);
						this.resetTable(target);
						return;
					}

					if (response.nombreCompleto) {
						this.profesorNombre.set(response.nombreCompleto);
					}

					if (response.asistencias && response.asistencias.length > 0) {
						this.hasData.set(true);
						const { ingresos, salidas } = this.attendanceDataService.processAsistencias(
							response.asistencias,
							month,
							year,
							this.profesorNombre(),
						);
						if (target === 'ingresos') {
							this.ingresos.set(ingresos);
							// Mantener salidas en su mes actual salvo coincidencia
							if (this.salidas().selectedMonth === month && this.salidas().selectedYear === year) {
								this.salidas.set(salidas);
							}
						} else {
							this.salidas.set(salidas);
							if (this.ingresos().selectedMonth === month && this.ingresos().selectedYear === year) {
								this.ingresos.set(ingresos);
							}
						}
					} else {
						this.hasData.set(false);
						this.resetTable(target);
					}
				},
				error: (err) => {
					logger.error('AttendanceProfesorPropia: Error cargando mi asistencia', err);
					this.hasData.set(false);
					this.resetTable(target);
				},
			});
	}

	private resetTable(target: 'ingresos' | 'salidas'): void {
		if (target === 'ingresos') {
			this.ingresos.set(this.attendanceDataService.createEmptyTable('Mis Ingresos'));
		} else {
			this.salidas.set(this.attendanceDataService.createEmptyTable('Mis Salidas'));
		}
	}
}
