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
import { AsistenciaAsistenteAdminApiService } from '@shared/services/attendance';
import { logger } from '@core/helpers';

/**
 * Vista "Mi asistencia" del Asistente Administrativo autenticado (Plan 28 Chat 4a).
 *
 * Mirror de `AttendanceProfesorPropiaComponent`. Consume `/api/asistente-administrativo/me/mes`
 * (DNI desde claim, INV-AD08 read-only). Solo modo mes — el pill día/mes del header
 * cross-role no aplica (igual que profesor/estudiante viendo su propia asistencia).
 *
 * Las correcciones formales sobre `TipoPersona='A'` se hacen vía
 * `/intranet/admin/asistencias` con jurisdicción de `Roles.SupervisoresAsistenteAdmin`
 * (INV-AD08): Director, Promotor, Coordinador Académico — nunca el propio AA.
 */
@Component({
	selector: 'app-attendance-asistente-admin-propia',
	standalone: true,
	imports: [AttendanceLegendComponent, AttendanceTableComponent, EmptyStateComponent],
	templateUrl: './attendance-asistente-admin-propia.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceAsistenteAdminPropiaComponent implements OnInit {
	private readonly api = inject(AsistenciaAsistenteAdminApiService);
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

	// * Nombre resuelto desde el backend (`AsistenciaAsistenteAdminDto.nombreCompleto`).
	private readonly asistenteAdminNombre = signal<string>('Asistente Administrativo');

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
						this.asistenteAdminNombre.set(response.nombreCompleto);
					}

					if (response.asistencias && response.asistencias.length > 0) {
						this.hasData.set(true);
						const { ingresos, salidas } = this.attendanceDataService.processAsistencias(
							response.asistencias,
							month,
							year,
							this.asistenteAdminNombre(),
						);
						if (target === 'ingresos') {
							this.ingresos.set(ingresos);
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
					logger.error('AttendanceAsistenteAdminPropia: Error cargando mi asistencia', err);
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
