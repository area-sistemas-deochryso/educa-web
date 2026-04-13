import { AttendanceService, GradoSeccion, StorageService } from '@core/services';
import { viewBlobInNewTab, downloadBlob } from '@core/helpers';
import { periodoEnMes, filtrarPorPeriodoAcademico } from '@shared/models';
import { JustificacionEvent } from '@features/intranet/components/attendance/attendance-day-list/attendance-day-list.component';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';

import { AttendanceDayListComponent } from '@features/intranet/components/attendance/attendance-day-list/attendance-day-list.component';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from '@features/intranet/components/attendance/attendance-table/attendance-table.component';
import { AttendanceTableSkeletonComponent } from '@features/intranet/components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { AttendanceViewController, SelectorContext } from '@features/intranet/services/attendance/attendance-view.service';
import { AttendancePdfService } from '@features/intranet/services/attendance/attendance-pdf.service';
import { AttendanceStatsService } from '@features/intranet/services/attendance/attendance-stats.service';
import { ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
import { ButtonModule } from 'primeng/button';
import { DatePipe } from '@angular/common';
import { EmptyStateComponent } from '@features/intranet/components/attendance/empty-state/empty-state.component';
import { FormsModule } from '@angular/forms';
import { GradoSeccionSelectorComponent } from '@features/intranet/components/attendance/grado-seccion-selector/grado-seccion-selector.component';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	TipoReporte,
	TipoReporteGroup,
	TIPO_REPORTE_OPTIONS,
	getTodosSalonesObservable,
	getConsolidadoFileName,
} from './consolidated-pdf.helper';

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
		AttendanceDayListComponent,
		EmptyStateComponent,
		AttendanceLegendComponent,
		ButtonModule,
		TooltipModule,
		MenuModule,
		Select,
		SelectButton,
		FormsModule,
		DatePipe,
	],
	providers: [AttendanceViewController, AttendancePdfService, AttendanceStatsService],
	templateUrl: './attendance-director.component.html',
	styleUrl: './attendance-director.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorComponent implements OnInit {
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	private asistenciaService = inject(AttendanceService);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	// * Shared controller handles month/day, tables, and PDF actions.
	readonly view = inject(AttendanceViewController);

// #endregion
	// #region Tipo de reporte

	readonly tipoReporteOptions: TipoReporteGroup[] = TIPO_REPORTE_OPTIONS;
	readonly tipoReporte = signal<TipoReporte>('salon-dia');
	readonly downloadingPdfConsolidado = signal(false);
	readonly savingJustificacion = signal(false);

	// #endregion
	// #region Grados y secciones

	private readonly allGradosSecciones = signal<GradoSeccion[]>([]);
	readonly gradosSecciones = computed(() => {
		const all = this.allGradosSecciones();
		const month = this.view.ingresos().selectedMonth;
		const periodo = periodoEnMes(month);
		return filtrarPorPeriodoAcademico(all, periodo, (gs) => gs.seccion);
	});
	readonly selectedGradoSeccion = signal<GradoSeccion | null>(null);

	ngOnInit(): void {
		// * Configure shared controller callbacks for director endpoints + storage.
		this.view.init({
			loadEstudiantes: (grado, seccion, mes, anio) =>
				this.asistenciaService.getAsistenciasGradoDirector(grado, seccion, mes, anio),
			loadDia: (grado, seccion, fecha) =>
				this.asistenciaService.getAsistenciaDiaDirector(grado, seccion, fecha),
			getSelectorContext: () => this.getSelectorContext(),
			onMonthChange: () => this.reselectGradoSeccionIfNeeded(),
			getStoredEstudianteId: () => this.storage.getSelectedEstudianteDirectorId(),
			setStoredEstudianteId: (id) => this.storage.setSelectedEstudianteDirectorId(id),
		});
		this.loadGradosSecciones();
	}

	// #endregion
	// #region Carga y selección de grado/sección

	private loadGradosSecciones(): void {
		// * Fetch available groups, then restore selection and load data.
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
		// * Avoid reload if the same grade/section is re-selected.
		if (current?.grado === gradoSeccion.grado && current?.seccion === gradoSeccion.seccion)
			return;

		this.selectedGradoSeccion.set(gradoSeccion);
		this.saveSelectedGradoSeccion();
		this.view.reload();
	}

	private restoreSelectedGradoSeccion(): void {
		// * Persisted selection keeps context between visits.
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
		// * When month changes (verano filter), ensure selection is still valid.
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

	readonly pdfMenuItems = computed<MenuItem[]>(() => {
		const isMonthMode = this.view.viewMode() === 'mes';

		if (isMonthMode) {
			// Month mode: always salon (periodo or mensual)
			const isPeriodo = this.view.monthSubMode() === 'periodo';
			return [
				{
					label: 'Ver PDF',
					icon: 'pi pi-eye',
					command: () =>
						isPeriodo
							? this.view.verPdfAsistenciaPeriodo()
							: this.view.verPdfAsistenciaMes(),
				},
				{
					label: 'Descargar PDF',
					icon: 'pi pi-download',
					command: () =>
						isPeriodo
							? this.view.descargarPdfAsistenciaPeriodo()
							: this.view.descargarPdfAsistenciaMes(),
				},
			];
		}

		// Day mode: depends on tipoReporte
		const tipo = this.tipoReporte();
		return [
			{
				label: 'Ver PDF',
				icon: 'pi pi-eye',
				command: () => this.verPdf(tipo),
			},
			{
				label: 'Descargar PDF',
				icon: 'pi pi-download',
				command: () => this.descargarPdf(tipo),
			},
		];
	});

	togglePdfMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	// #endregion
	// #region Justificación

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
						// Recargar datos del día para reflejar el cambio
						this.view.reload();
					}
				},
			});
	}

	// #endregion
	// #region PDF dispatch (día mode)

	private verPdf(tipo: TipoReporte): void {
		switch (tipo) {
			case 'salon-dia':
				return this.view.verPdfAsistenciaDia();
			case 'salon-mes':
				return this.view.verPdfSalonMes();
			case 'salon-anio':
				return this.view.verPdfSalonAnio();
			default:
				return this.verPdfConsolidado();
		}
	}

	private descargarPdf(tipo: TipoReporte): void {
		switch (tipo) {
			case 'salon-dia':
				return this.view.descargarPdfAsistenciaDia();
			case 'salon-mes':
				return this.view.descargarPdfSalonMes();
			case 'salon-anio':
				return this.view.descargarPdfSalonAnio();
			default:
				return this.descargarPdfConsolidado();
		}
	}

	// #endregion
	// #region PDF Consolidados (todos los salones)

	private verPdfConsolidado(): void {
		this.runConsolidadoPdf((blob) => viewBlobInNewTab(blob));
	}

	private descargarPdfConsolidado(): void {
		this.runConsolidadoPdf((blob) =>
			downloadBlob(blob, getConsolidadoFileName(this.tipoReporte(), this.view.fechaDia())),
		);
	}

	private runConsolidadoPdf(handle: (blob: Blob) => void): void {
		this.downloadingPdfConsolidado.set(true);
		const obs$ = getTodosSalonesObservable(
			this.asistenciaService,
			this.tipoReporte(),
			this.view.fechaDia(),
		);
		if (!obs$) {
			this.downloadingPdfConsolidado.set(false);
			return;
		}
		obs$
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdfConsolidado.set(false)),
			)
			.subscribe({ next: handle });
	}

	// #endregion
	// #region Helpers privados

	private getSelectorContext(): SelectorContext | null {
		const gs = this.selectedGradoSeccion();
		if (!gs) return null;
		return { grado: gs.grado, gradoCodigo: gs.gradoCodigo, seccion: gs.seccion };
	}
	// #endregion
}
