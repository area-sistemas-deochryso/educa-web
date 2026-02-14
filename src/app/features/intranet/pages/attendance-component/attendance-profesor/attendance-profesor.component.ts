import { AsistenciaService, SalonProfesor, StorageService, UserProfileService } from '@core/services';
import { JustificacionEvent } from '../../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';
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
import { finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente Container para vista de asistencias de Profesores.
 * Maneja la selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de salÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n; la lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³gica compartida (estudiantes,
 * modo dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a/mes, tablas y PDF) vive en AttendanceViewController.
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
	// * Shared controller handles month/day, tables, and PDF actions.
	readonly view = inject(AttendanceViewController);
	// * Used by the selector and PDF header.
	readonly nombreProfesor = inject(UserProfileService).userName;

	// #region Salones

	/** SalÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n pendiente de selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n (viene de query param antes de que carguen los salones) */
	private _pendingSalonId: number | null = null;
	private readonly allSalones = signal<SalonProfesor[]>([]);
	readonly salones = computed(() => {
		const all = this.allSalones();
		const month = this.view.ingresos().selectedMonth;
		const isVerano = month === 1 || month === 2;
		// * Summer months only show "V" sections.
		return all.filter((s) =>
			isVerano
				? s.seccion.toUpperCase() === 'V'
				: s.seccion.toUpperCase() !== 'V',
		);
	});
	readonly selectedSalonId = signal<number | null>(null);
	readonly selectedSalon = computed(() => {
		const id = this.selectedSalonId();
		// Buscar primero en salones filtrados, luego en todos (para query param que bypass verano filter)
		return this.salones().find((s) => s.salonId === id)
			|| this.allSalones().find((s) => s.salonId === id)
			|| null;
	});

	// #endregion
	// #region JustificaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
	readonly savingJustificacion = signal(false);

	ngOnInit(): void {
		// * Configure shared controller callbacks for profesor endpoints + storage.
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

	// #endregion
	// #region Carga y selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de salÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n

	private loadSalones(): void {
		// * Fetch from both ProfesorSalon (tutor) and Horarios (teaching), then merge.
		this.view.loading.set(true);

		forkJoin({
			tutoria: this.asistenciaService.getSalonesProfesor(),
			horario: this.asistenciaService.getSalonesProfesorPorHorario(),
		})
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.salones().length === 0) {
						this.view.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: ({ tutoria, horario }) => {
					// Merge: tutoria takes priority (has EsTutor=true), add horario salons not already present
					const merged = [...tutoria];
					const existingIds = new Set(tutoria.map((s) => s.salonId));
					for (const salon of horario) {
						if (!existingIds.has(salon.salonId)) {
							merged.push(salon);
						}
					}
					this.allSalones.set(merged);

					// Si hay un salÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n pendiente de query param, buscarlo en TODOS los salones
					if (this._pendingSalonId !== null) {
						const pending = this._pendingSalonId;
						this._pendingSalonId = null;
						const found = merged.some((s) => s.salonId === pending);
						if (found) {
							this.selectedSalonId.set(pending);
							this.saveSelectedSalon();
							this.view.reload();
							return;
						}
					}

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
		// * Avoid reload if the same salon is re-selected.
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.view.reload();
	}

	private restoreSelectedSalon(): void {
		// * Persisted selection helps keep context between navigations.
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
		// * When month changes (verano filter), ensure selection is still valid.
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

	/**
	 * Pre-selecciona un salÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n desde query param (ej: navegaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n desde horarios).
	 * Si los salones ya estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡n cargados, selecciona inmediatamente.
	 * Si no, guarda como pendiente para aplicar cuando loadSalones complete.
	 */
	selectSalonFromQueryParam(salonId: number): void {
		if (this.salones().length > 0) {
			this.selectSalon(salonId);
		} else {
			this._pendingSalonId = salonId;
		}
	}

	// #endregion
	// #region Delegados al servicio (llamados por el padre via @ViewChild)

	// * Parent component calls these via ViewChild.
	setViewMode(mode: ViewMode): void {
		this.view.setViewMode(mode);
	}

	reload(): void {
		this.view.reload();
	}

	// #endregion
	// #region PDF menu

	togglePdfMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	// #endregion
	// #region JustificaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n

	onJustificar(event: JustificacionEvent): void {
		const fecha = this.view.fechaDia();
		this.savingJustificacion.set(true);

		this.asistenciaService
			.justificarAsistencia(event.estudianteId, fecha, event.observacion, event.quitar)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.savingJustificacion.set(false)),
			)
			.subscribe({
				next: (response) => {
					if (response.success) {
						// Recargar datos del dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a para reflejar el cambio
						this.view.reload();
					}
				},
			});
	}

	// #endregion
	// #region Helpers privados

	private getSelectorContext(): SelectorContext | null {
		const salon = this.selectedSalon();
		if (!salon) return null;
		return { grado: salon.grado, gradoCodigo: salon.gradoCodigo, seccion: salon.seccion };
	}
	// #endregion
}
