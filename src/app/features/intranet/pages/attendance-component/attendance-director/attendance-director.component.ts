import { AsistenciaService, GradoSeccion, StorageService } from '@core/services';
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
import { GradoSeccionSelectorComponent } from '../../../components/attendance/grado-seccion-selector/grado-seccion-selector.component';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente Container para vista de asistencias de Directores.
 * Maneja la selección de grado/sección; la lógica compartida (estudiantes,
 * modo día/mes, tablas y PDF) vive en AttendanceViewController.
 */
@Component({
	selector: 'app-attendance-director',
	standalone: true,
	imports: [
		AttendanceTableComponent,
		AttendanceTableSkeletonComponent,
		GradoSeccionSelectorComponent,
		AsistenciaDiaListComponent,
		EmptyStateComponent,
		AttendanceLegendComponent,
		ButtonModule,
		TooltipModule,
		MenuModule,
		DatePipe,
	],
	providers: [AttendanceViewController],
	templateUrl: './attendance-director.component.html',
	styleUrl: './attendance-director.component.scss',
})
export class AttendanceDirectorComponent implements OnInit {
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	readonly view = inject(AttendanceViewController);

	// ============ Grados y secciones ============

	private readonly allGradosSecciones = signal<GradoSeccion[]>([]);
	readonly gradosSecciones = computed(() => {
		const all = this.allGradosSecciones();
		const month = this.view.ingresos().selectedMonth;
		const isVerano = month === 1 || month === 2;
		return all.filter((gs) =>
			isVerano
				? gs.seccion.toUpperCase() === 'V'
				: gs.seccion.toUpperCase() !== 'V',
		);
	});
	readonly selectedGradoSeccion = signal<GradoSeccion | null>(null);

	ngOnInit(): void {
		this.view.init({
			loadEstudiantes: (gradoCodigo, seccion, mes, anio) =>
				this.asistenciaService.getAsistenciasGradoDirector(gradoCodigo, seccion, mes, anio),
			loadDia: (gradoCodigo, seccion, fecha) =>
				this.asistenciaService.getAsistenciaDiaDirector(gradoCodigo, seccion, fecha),
			getSelectorContext: () => this.getSelectorContext(),
			onMonthChange: () => this.reselectGradoSeccionIfNeeded(),
			getStoredEstudianteId: () => this.storage.getSelectedEstudianteDirectorId(),
			setStoredEstudianteId: (id) => this.storage.setSelectedEstudianteDirectorId(id),
		});
		this.loadGradosSecciones();
	}

	// ============ Carga y selección de grado/sección ============

	private loadGradosSecciones(): void {
		this.view.loading.set(true);

		this.asistenciaService
			.getGradosSeccionesDisponibles()
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.gradosSecciones().length === 0) {
						this.view.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (grados) => {
					this.allGradosSecciones.set(grados);
					if (this.gradosSecciones().length > 0) {
						this.restoreSelectedGradoSeccion();
						this.view.reload();
					}
				},
				error: () => {
					this.view.loading.set(false);
				},
			});
	}

	selectGradoSeccion(gradoSeccion: GradoSeccion): void {
		const current = this.selectedGradoSeccion();
		if (current?.grado === gradoSeccion.grado && current?.seccion === gradoSeccion.seccion)
			return;

		this.selectedGradoSeccion.set(gradoSeccion);
		this.saveSelectedGradoSeccion();
		this.view.reload();
	}

	private restoreSelectedGradoSeccion(): void {
		const saved = this.storage.getSelectedGradoSeccionDirector();
		if (saved) {
			const found = this.gradosSecciones().find(
				(gs) => gs.grado === saved.grado && gs.seccion === saved.seccion,
			);
			if (found) {
				this.selectedGradoSeccion.set(found);
				return;
			}
		}
		const first = this.gradosSecciones()[0];
		if (first) {
			this.selectedGradoSeccion.set(first);
		}
	}

	private saveSelectedGradoSeccion(): void {
		const gs = this.selectedGradoSeccion();
		if (gs) {
			this.storage.setSelectedGradoSeccionDirector(gs);
		}
	}

	private reselectGradoSeccionIfNeeded(): void {
		const current = this.selectedGradoSeccion();
		const filtered = this.gradosSecciones();
		if (
			current &&
			filtered.some((gs) => gs.grado === current.grado && gs.seccion === current.seccion)
		) {
			return;
		}
		const first = filtered[0] ?? null;
		this.selectedGradoSeccion.set(first);
		if (first) {
			this.saveSelectedGradoSeccion();
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
		const gs = this.selectedGradoSeccion();
		if (!gs) return null;
		return { grado: gs.grado, gradoCodigo: gs.gradoCodigo, seccion: gs.seccion };
	}
}
