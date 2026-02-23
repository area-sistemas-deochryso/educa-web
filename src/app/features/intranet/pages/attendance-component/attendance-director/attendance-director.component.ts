import { AsistenciaService, GradoSeccion, StorageService } from '@core/services';
import { viewBlobInNewTab, downloadBlob } from '@core/helpers';
import { JustificacionEvent } from '../../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';

import { AsistenciaDiaListComponent } from '../../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { AttendanceTableSkeletonComponent } from '../../../components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { AttendanceViewController, SelectorContext } from '../../../services/attendance/attendance-view.service';
import { ViewMode } from '../../../components/attendance/attendance-header/attendance-header.component';
import { ButtonModule } from 'primeng/button';
import { DatePipe } from '@angular/common';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';
import { FormsModule } from '@angular/forms';
import { GradoSeccionSelectorComponent } from '../../../components/attendance/grado-seccion-selector/grado-seccion-selector.component';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// #region Tipos de reporte

type TipoReporte = 'salon' | 'consolidado-dia' | 'consolidado-semana' | 'consolidado-mes' | 'consolidado-anio';

interface TipoReporteOption {
	label: string;
	value: TipoReporte;
}

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
		Select,
		SelectButton,
		FormsModule,
		DatePipe,
	],
	providers: [AttendanceViewController],
	templateUrl: './attendance-director.component.html',
	styleUrl: './attendance-director.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorComponent implements OnInit {
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	// * Shared controller handles month/day, tables, and PDF actions.
	readonly view = inject(AttendanceViewController);

// #endregion
	// #region Tipo de reporte

	readonly tipoReporteOptions: TipoReporteOption[] = [
		{ label: 'Reporte por Salón', value: 'salon' },
		{ label: 'Consolidado - Día', value: 'consolidado-dia' },
		{ label: 'Consolidado - Semana', value: 'consolidado-semana' },
		{ label: 'Consolidado - Mes', value: 'consolidado-mes' },
		{ label: 'Consolidado - Año', value: 'consolidado-anio' },
	];
	readonly tipoReporte = signal<TipoReporte>('salon');
	readonly downloadingPdfConsolidado = signal(false);
	readonly savingJustificacion = signal(false);

	// #endregion
	// #region Grados y secciones

	private readonly allGradosSecciones = signal<GradoSeccion[]>([]);
	readonly gradosSecciones = computed(() => {
		const all = this.allGradosSecciones();
		const month = this.view.ingresos().selectedMonth;
		const isVerano = month === 1 || month === 2;
		// * Summer months only show "V" sections.
		return all.filter((gs) =>
			isVerano
				? gs.seccion.toUpperCase() === 'V'
				: gs.seccion.toUpperCase() !== 'V',
		);
	});
	readonly selectedGradoSeccion = signal<GradoSeccion | null>(null);

	ngOnInit(): void {
		// * Configure shared controller callbacks for director endpoints + storage.
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
		if (tipo === 'salon') {
			return [
				{
					label: 'Ver PDF',
					icon: 'pi pi-eye',
					command: () => this.view.verPdfAsistenciaDia(),
				},
				{
					label: 'Descargar PDF',
					icon: 'pi pi-download',
					command: () => this.view.descargarPdfAsistenciaDia(),
				},
			];
		}

		// Consolidados (day mode only)
		return [
			{
				label: 'Ver PDF',
				icon: 'pi pi-eye',
				command: () => this.verPdfConsolidado(),
			},
			{
				label: 'Descargar PDF',
				icon: 'pi pi-download',
				command: () => this.descargarPdfConsolidado(),
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
	// #region PDF Consolidados

	private verPdfConsolidado(): void {
		const tipo = this.tipoReporte();
		this.downloadingPdfConsolidado.set(true);

		const obs$ = this.getPdfObservable(tipo);
		if (!obs$) {
			this.downloadingPdfConsolidado.set(false);
			return;
		}

		obs$
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdfConsolidado.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	private descargarPdfConsolidado(): void {
		const tipo = this.tipoReporte();
		this.downloadingPdfConsolidado.set(true);

		const obs$ = this.getPdfObservable(tipo);
		if (!obs$) {
			this.downloadingPdfConsolidado.set(false);
			return;
		}

		obs$
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdfConsolidado.set(false)),
			)
			.subscribe({
				next: (blob) => downloadBlob(blob, this.getConsolidadoFileName(tipo)),
			});
	}

	private getPdfObservable(tipo: TipoReporte): Observable<Blob> | null {
		const fecha = this.view.pdfFecha();
		const { selectedMonth, selectedYear } = this.view.ingresos();

		switch (tipo) {
			case 'consolidado-dia':
				return this.asistenciaService.descargarPdfTodosSalonesDia(fecha);
			case 'consolidado-semana':
				// Calcular inicio de la semana actual del mes/año seleccionado
				const inicioSemana = this.getInicioSemanaActual(selectedMonth, selectedYear);
				return this.asistenciaService.descargarPdfTodosSalonesSemana(inicioSemana);
			case 'consolidado-mes':
				return this.asistenciaService.descargarPdfTodosSalonesMes(selectedMonth, selectedYear);
			case 'consolidado-anio':
				return this.asistenciaService.descargarPdfTodosSalonesAnio(selectedYear);
			default:
				return null;
		}
	}

	/**
	 * Obtiene el inicio de la semana actual (lunes) dentro del mes/año especificado
	 */
	private getInicioSemanaActual(mes: number, anio: number): Date {
		const hoy = new Date();
		const fechaMesSeleccionado = new Date(anio, mes - 1, 1);

		// Si el mes/año seleccionado es diferente al actual, usar la primera semana de ese mes
		if (hoy.getMonth() + 1 !== mes || hoy.getFullYear() !== anio) {
			// Primera semana del mes: encontrar el primer lunes
			const primerDia = fechaMesSeleccionado.getDay(); // 0 = domingo, 1 = lunes, ...
			const diasHastaLunes = primerDia === 0 ? 1 : primerDia === 1 ? 0 : 8 - primerDia;
			return new Date(anio, mes - 1, 1 + diasHastaLunes);
		}

		// Si es el mes/año actual, calcular el lunes de la semana actual
		const diaSemana = hoy.getDay();
		const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // Si es domingo, retroceder 6 días
		const lunes = new Date(hoy);
		lunes.setDate(hoy.getDate() + diff);
		return lunes;
	}

	private getConsolidadoFileName(tipo: TipoReporte): string {
		const fecha = this.view.pdfFecha();
		const { selectedMonth, selectedYear } = this.view.ingresos();
		const fechaStr = fecha.toISOString().split('T')[0];

		switch (tipo) {
			case 'consolidado-dia':
				return `Reporte_TodosSalones_${fechaStr}.pdf`;
			case 'consolidado-semana':
				const inicioSemana = this.getInicioSemanaActual(selectedMonth, selectedYear);
				const semanaStr = inicioSemana.toISOString().split('T')[0];
				return `Reporte_TodosSalones_Semana_${semanaStr}.pdf`;
			case 'consolidado-mes':
				return `Reporte_TodosSalones_${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.pdf`;
			case 'consolidado-anio':
				return `Reporte_TodosSalones_${selectedYear}.pdf`;
			default:
				return 'Reporte_TodosSalones.pdf';
		}
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
