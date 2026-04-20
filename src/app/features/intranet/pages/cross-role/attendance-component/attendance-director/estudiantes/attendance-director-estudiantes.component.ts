import { AttendanceService, GradoSeccion, StorageService } from '@core/services';
import { downloadBlob, viewBlobInNewTab } from '@core/helpers';
import { periodoEnMes, filtrarPorPeriodoAcademico } from '@shared/models';
import { JustificacionEvent } from '@features/intranet/components/attendance/attendance-day-list/attendance-day-list.component';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';

import { AttendanceDayListComponent } from '@features/intranet/components/attendance/attendance-day-list/attendance-day-list.component';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from '@features/intranet/components/attendance/attendance-table/attendance-table.component';
import { AttendanceTableSkeletonComponent } from '@features/intranet/components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { AttendanceViewController } from '@features/intranet/services/attendance/attendance-view.service';
import { SelectorContext } from '@features/intranet/services/attendance/attendance-view.models';
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
} from '../consolidated-pdf.helper';

/**
 * Vista "Estudiantes" dentro del panel admin de asistencia
 * (`/intranet/asistencia` para Director + 3 administrativos no-Director).
 *
 * Extraída de `attendance-director.component` en Plan 21 Chat 3 para permitir
 * coexistir con la vista "Profesores" vía submenú en el shell.
 */
@Component({
	selector: 'app-attendance-director-estudiantes',
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
	templateUrl: './attendance-director-estudiantes.component.html',
	styleUrl: './attendance-director-estudiantes.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorEstudiantesComponent implements OnInit {
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	private asistenciaService = inject(AttendanceService);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	readonly view = inject(AttendanceViewController);

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

	// #endregion
	// #region Delegados al servicio (llamados por el padre vía @ViewChild)
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
			const isPeriodo = this.view.monthSubMode() === 'periodo';
			const { selectedMonth, selectedYear } = this.view.ingresos();
			return [
				{
					label: 'Ver PDF',
					icon: 'pi pi-eye',
					command: () =>
						isPeriodo
							? this.view.pdf.verPeriodoFromContext(this.view.periodoInicio(), selectedYear, this.view.periodoFin())
							: this.view.pdf.verMesFromContext(selectedMonth, selectedYear),
				},
				{
					label: 'Descargar PDF',
					icon: 'pi pi-download',
					command: () =>
						isPeriodo
							? this.view.pdf.descargarPeriodoFromContext(this.view.periodoInicio(), selectedYear, this.view.periodoFin())
							: this.view.pdf.descargarMesFromContext(selectedMonth, selectedYear),
				},
			];
		}

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
						this.view.reload();
					}
				},
			});
	}

	// #endregion
	// #region PDF dispatch (día mode)
	private verPdf(tipo: TipoReporte): void {
		const fecha = this.view.fechaDia();
		switch (tipo) {
			case 'salon-dia':
				return this.view.pdf.verPdfAsistenciaDia(fecha);
			case 'salon-mes':
				return this.view.pdf.verPdfSalonMes(fecha);
			case 'salon-anio':
				return this.view.pdf.verPdfSalonAnio(fecha);
			default:
				return this.verPdfConsolidado();
		}
	}

	private descargarPdf(tipo: TipoReporte): void {
		const fecha = this.view.fechaDia();
		switch (tipo) {
			case 'salon-dia':
				return this.view.pdf.descargarPdfAsistenciaDia(fecha);
			case 'salon-mes':
				return this.view.pdf.descargarPdfSalonMes(fecha);
			case 'salon-anio':
				return this.view.pdf.descargarPdfSalonAnio(fecha);
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
