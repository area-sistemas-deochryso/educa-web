import { AsistenciaService, SalonProfesor, StorageService, UserProfileService } from '@core/services';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';

import { AsistenciaDiaListComponent } from '../../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { AttendanceTableSkeletonComponent } from '../../../components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { AttendanceViewController, SelectorContext } from '../../../services/attendance/attendance-view.service';
import { ViewMode } from '../../../components/attendance/attendance-header/attendance-header.component';
import { ButtonModule } from 'primeng/button';
import { DatePipe } from '@angular/common';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';
import { Menu, MenuModule } from 'primeng/menu';
import { SalonSelectorComponent } from '../../../components/attendance/salon-selector/salon-selector.component';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente Container para vista de asistencias de Profesores.
 * Maneja la selección de salón; la lógica compartida (estudiantes,
 * modo día/mes, tablas y PDF) vive en AttendanceViewController.
 */
@Component({
	selector: 'app-attendance-profesor',
	standalone: true,
	imports: [
		AttendanceTableComponent,
		AttendanceTableSkeletonComponent,
		SalonSelectorComponent,
		AsistenciaDiaListComponent,
		EmptyStateComponent,
		AttendanceLegendComponent,
		ButtonModule,
		TooltipModule,
		MenuModule,
		DatePipe,
	],
	providers: [AttendanceViewController],
	templateUrl: './attendance-profesor.component.html',
	styleUrl: './attendance-profesor.component.scss',
})
export class AttendanceProfesorComponent implements OnInit {
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	readonly view = inject(AttendanceViewController);
	readonly nombreProfesor = inject(UserProfileService).userName;

	// ============ Salones ============

	private readonly allSalones = signal<SalonProfesor[]>([]);
	readonly salones = computed(() => {
		const all = this.allSalones();
		const month = this.view.ingresos().selectedMonth;
		const isVerano = month === 1 || month === 2;
		return all.filter((s) =>
			isVerano
				? s.seccion.toUpperCase() === 'V'
				: s.seccion.toUpperCase() !== 'V',
		);
	});
	readonly selectedSalonId = signal<number | null>(null);
	readonly selectedSalon = computed(() => {
		const id = this.selectedSalonId();
		return this.salones().find((s) => s.salonId === id) || null;
	});

	ngOnInit(): void {
		this.view.init({
			loadEstudiantes: (gradoCodigo, seccion, mes, anio) =>
				this.asistenciaService.getAsistenciasGrado(gradoCodigo, seccion, mes, anio),
			loadDia: (gradoCodigo, seccion, fecha) =>
				this.asistenciaService.getAsistenciaDia(gradoCodigo, seccion, fecha),
			getSelectorContext: () => this.getSelectorContext(),
			onMonthChange: () => this.reselectSalonIfNeeded(),
			getStoredEstudianteId: () => this.storage.getSelectedEstudianteId(),
			setStoredEstudianteId: (id) => this.storage.setSelectedEstudianteId(id),
		});
		this.loadSalones();
	}

	// ============ Carga y selección de salón ============

	private loadSalones(): void {
		this.view.loading.set(true);

		this.asistenciaService
			.getSalonesProfesor()
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.salones().length === 0) {
						this.view.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (salones) => {
					this.allSalones.set(salones);
					if (this.salones().length > 0) {
						this.restoreSelectedSalon();
						this.view.reload();
					}
				},
				error: () => {
					this.view.loading.set(false);
				},
			});
	}

	selectSalon(salonId: number): void {
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.view.reload();
	}

	private restoreSelectedSalon(): void {
		const salonId = this.storage.getSelectedSalonId();
		if (salonId !== null && this.salones().some((s) => s.salonId === salonId)) {
			this.selectedSalonId.set(salonId);
			return;
		}
		const firstSalon = this.salones()[0];
		if (firstSalon) {
			this.selectedSalonId.set(firstSalon.salonId);
		}
	}

	private saveSelectedSalon(): void {
		const id = this.selectedSalonId();
		if (id) {
			this.storage.setSelectedSalonId(id);
		}
	}

	private reselectSalonIfNeeded(): void {
		const currentId = this.selectedSalonId();
		const filtered = this.salones();
		if (currentId && filtered.some((s) => s.salonId === currentId)) {
			return;
		}
		const first = filtered[0] ?? null;
		this.selectedSalonId.set(first?.salonId ?? null);
		if (first) {
			this.saveSelectedSalon();
		}
	}

	// ============ Delegados al servicio (llamados por el padre via @ViewChild) ============

	setViewMode(mode: ViewMode): void {
		this.view.setViewMode(mode);
	}

	reload(): void {
		this.view.reload();
	}

	// ============ PDF menu ============

	togglePdfMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	// ============ Helpers privados ============

	private getSelectorContext(): SelectorContext | null {
		const salon = this.selectedSalon();
		if (!salon) return null;
		return { grado: salon.grado, gradoCodigo: salon.gradoCodigo, seccion: salon.seccion };
	}
}
