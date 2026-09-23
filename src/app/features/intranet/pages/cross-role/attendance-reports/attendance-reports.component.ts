import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableSkeletonComponent } from '@intranet-shared/components/table-skeleton/table-skeleton.component';
import { StatsSkeletonComponent } from '@intranet-shared/components/stats-skeleton/stats-skeleton.component';
import { ErrorStateComponent } from '@shared/components';
import { MODO_REPORTE_OPTIONS, TABLE_SKELETON_COLUMNS } from './config/attendance-reports.config';
import { ReportsFiltersComponent } from './components/reports-filters/reports-filters.component';
import { ReportsSummaryComponent } from './components/reports-summary/reports-summary.component';
import { ReportsResultComponent } from './components/reports-result/reports-result.component';
import { UsuarioReportComponent } from './components/usuario-report/usuario-report.component';
import { AttendanceReportsFacade } from './services';
import { EduButton, EduSelectButton } from '@edu-ui';
import {
	salonToOption,
	TIPOS_PERSONA,
	RANGO_TIPOS,
	type EstadoFiltro,
	type ModoReporte,
	type RangoTipo,
	type TipoPersonaReporte,
} from './models';

@Component({
	selector: 'app-attendance-reports',
	standalone: true,
	imports: [
		FormsModule,
		EduButton,
		EduSelectButton,
		ReportsFiltersComponent,
		ReportsSummaryComponent,
		ReportsResultComponent,
		UsuarioReportComponent,
		TableSkeletonComponent,
		StatsSkeletonComponent,
		ErrorStateComponent,
	],
	templateUrl: './attendance-reports.component.html',
	styleUrl: './attendance-reports.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceReportsComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(AttendanceReportsFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Modo del tab (Plan xrepo-109 F5)
	readonly modo = signal<ModoReporte>('agrupado');
	readonly modoOptions = MODO_REPORTE_OPTIONS;

	onModoChange(modo: ModoReporte): void {
		this.modo.set(modo);
	}
	// #endregion

	// #region Computed locales
	readonly salonOptions = computed(() =>
		this.vm().salonesDisponibles.map(salonToOption),
	);

	readonly skeletonColumns = TABLE_SKELETON_COLUMNS;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadSalones();
		this.applyQueryParams();
	}

	/**
	 * Drill-down desde `AttendancePanelComponent`: `?tab=reportes&tipoPersona=<tipo>&rango=<rango>`.
	 * Igual que en `AttendancesGestionComponent`, queda suscripto a `queryParamMap` (no solo el valor
	 * inicial) para soportar navegaciones repetidas al mismo tab con distintos filtros.
	 */
	private applyQueryParams(): void {
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const tipoPersona = params.get('tipoPersona');
				const rango = params.get('rango');
				const partial: { tipoPersona?: TipoPersonaReporte; rango?: RangoTipo } = {};

				if (tipoPersona && (TIPOS_PERSONA as readonly string[]).includes(tipoPersona)) {
					partial.tipoPersona = tipoPersona as TipoPersonaReporte;
				}
				if (rango && (RANGO_TIPOS as readonly string[]).includes(rango)) {
					partial.rango = rango as RangoTipo;
				}
				if (Object.keys(partial).length > 0) {
					this.facade.updateFilters(partial);
				}
			});
	}
	// #endregion

	// #region Event handlers — Filtros
	onEstadoChange(estado: EstadoFiltro): void {
		this.facade.updateFilters({ estado });
	}

	onRangoChange(rango: RangoTipo): void {
		this.facade.updateFilters({ rango });
	}

	onFechaChange(fecha: Date): void {
		this.facade.updateFilters({ fecha });
	}

	onSalonesChange(salones: string[]): void {
		this.facade.updateFilters({ salonesSeleccionados: salones });
	}

	onTipoPersonaChange(tipoPersona: TipoPersonaReporte): void {
		this.facade.updateFilters({ tipoPersona });
	}

	onGenerar(): void {
		this.facade.generarReporte();
	}
	// #endregion

	// #region Event handlers — Export
	onExportPdf(): void {
		this.facade.exportarPdf();
	}

	onExportExcel(): void {
		this.facade.exportarExcel();
	}
	// #endregion

	// #region Event handlers — drill-down
	/**
	 * B1 — este componente solo se usa como tab "Reportes" del shell de Asistencias admin
	 * (`AttendancesShellComponent`), así que el botón de drill-down al tab Panel vive acá
	 * directamente en vez de en un wrapper del shell.
	 */
	irAPanel(): void {
		void this.router.navigate(['../panel'], { relativeTo: this.route });
	}
	// #endregion
}
