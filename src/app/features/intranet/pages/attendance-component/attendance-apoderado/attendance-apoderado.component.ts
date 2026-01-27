import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AsistenciaService, HijoApoderado, StorageService } from '@core/services';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';
import { AttendanceTable } from '../models/attendance.types';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';

/**
 * Componente Container para vista de asistencias de Apoderados.
 * Maneja la selección de hijos y muestra sus ingresos/salidas.
 */
@Component({
	selector: 'app-attendance-apoderado',
	standalone: true,
	imports: [AttendanceTableComponent, EmptyStateComponent],
	templateUrl: './attendance-apoderado.component.html',
})
export class AttendanceApoderadoComponent implements OnInit {
	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private attendanceDataService = inject(AttendanceDataService);
	private destroyRef = inject(DestroyRef);

	// Estado
	readonly loading = signal(false);
	readonly hijos = signal<HijoApoderado[]>([]);
	readonly selectedHijoId = signal<number | null>(null);
	readonly selectedHijo = computed(() => {
		const id = this.selectedHijoId();
		return this.hijos().find((h) => h.estudianteId === id) || null;
	});

	// Tablas de asistencia
	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Salidas'),
	);

	ngOnInit(): void {
		this.restoreSelectedMonth();
		this.loadHijos();
	}

	private restoreSelectedMonth(): void {
		const data = this.storage.getAttendanceMonth();
		if (data) {
			this.ingresos.update((table) => ({
				...table,
				selectedMonth: data.month,
				selectedYear: data.year,
			}));
			this.salidas.update((table) => ({
				...table,
				selectedMonth: data.month,
				selectedYear: data.year,
			}));
		}
	}

	private saveSelectedMonth(): void {
		this.storage.setAttendanceMonth({
			month: this.ingresos().selectedMonth,
			year: this.ingresos().selectedYear,
		});
	}

	private loadHijos(): void {
		this.loading.set(true);

		this.asistenciaService
			.getHijos()
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.hijos().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (hijos) => {
					this.hijos.set(hijos);
					if (hijos.length > 0) {
						this.restoreSelectedHijo();
						this.loadHijoAsistencias();
					}
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	selectHijo(estudianteId: number): void {
		if (this.selectedHijoId() === estudianteId) return;

		this.selectedHijoId.set(estudianteId);
		this.saveSelectedHijo();
		this.loadHijoAsistencias();
	}

	private restoreSelectedHijo(): void {
		const hijoId = this.storage.getSelectedHijoId();
		if (hijoId !== null && this.hijos().some((h) => h.estudianteId === hijoId)) {
			this.selectedHijoId.set(hijoId);
			return;
		}
		const firstHijo = this.hijos()[0];
		if (firstHijo) {
			this.selectedHijoId.set(firstHijo.estudianteId);
		}
	}

	private saveSelectedHijo(): void {
		const id = this.selectedHijoId();
		if (id) {
			this.storage.setSelectedHijoId(id);
		}
	}

	private loadHijoAsistencias(): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciaHijo(hijoId, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							hijo.nombreCompleto,
						);
						this.ingresos.set(tables.ingresos);
						this.salidas.set(tables.salidas);
					} else {
						this.ingresos.set(this.attendanceDataService.createEmptyTable('Ingresos'));
						this.salidas.set(this.attendanceDataService.createEmptyTable('Salidas'));
					}
				},
			});
	}

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
		this.reloadHijoIngresos();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
		this.reloadHijoSalidas();
	}

	private reloadHijoIngresos(): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciaHijo(hijoId, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							hijo.nombreCompleto,
						);
						this.ingresos.set(tables.ingresos);
					}
				},
			});
	}

	private reloadHijoSalidas(): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getAsistenciaHijo(hijoId, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							hijo.nombreCompleto,
						);
						this.salidas.set(tables.salidas);
					}
				},
			});
	}

	reload(): void {
		this.loadHijoAsistencias();
	}
}
