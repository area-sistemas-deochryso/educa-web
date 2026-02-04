import { AsistenciaService, HijoApoderado, StorageService } from '@core/services';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTable } from '../models/attendance.types';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente Container para vista de asistencias de Apoderados.
 * Maneja la selección de hijos y muestra sus ingresos/salidas.
 */
@Component({
	selector: 'app-attendance-apoderado',
	standalone: true,
	imports: [AttendanceTableComponent, EmptyStateComponent, AttendanceLegendComponent],
	templateUrl: './attendance-apoderado.component.html',
})
export class AttendanceApoderadoComponent implements OnInit {
	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private attendanceDataService = inject(AttendanceDataService);
	private destroyRef = inject(DestroyRef);

	// * Local state for child list + selection.
	readonly loading = signal(false);
	readonly hijos = signal<HijoApoderado[]>([]);
	readonly selectedHijoId = signal<number | null>(null);
	readonly selectedHijo = computed(() => {
		const id = this.selectedHijoId();
		return this.hijos().find((h) => h.estudianteId === id) || null;
	});

	// * Attendance tables update from the selected child and month.
	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Salidas'),
	);

	ngOnInit(): void {
		// * Initial load fetches children and restores last selection.
		this.loadHijos();
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
		// * Try persisted selection, otherwise default to first child.
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

		// * Fetch month summary for the selected child and map to tables.
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
		// * Month selector updates only the ingresos table.
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.reloadHijoIngresos();
	}

	onSalidasMonthChange(month: number): void {
		// * Month selector updates only the salidas table.
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
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
