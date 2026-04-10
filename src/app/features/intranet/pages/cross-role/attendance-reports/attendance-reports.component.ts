import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableSkeletonComponent } from '@intranet-shared/components/table-skeleton/table-skeleton.component';
import { StatsSkeletonComponent } from '@intranet-shared/components/stats-skeleton/stats-skeleton.component';
import { TABLE_SKELETON_COLUMNS } from './config/attendance-reports.config';
import { ReportsFiltersComponent } from './components/reports-filters/reports-filters.component';
import { ReportsSummaryComponent } from './components/reports-summary/reports-summary.component';
import { ReportsResultComponent } from './components/reports-result/reports-result.component';
import { AttendanceReportsFacade } from './services';
import { salonToOption, type EstadoFiltro, type RangoTipo } from './models';

@Component({
	selector: 'app-attendance-reports',
	standalone: true,
	imports: [
		ButtonModule,
		ReportsFiltersComponent,
		ReportsSummaryComponent,
		ReportsResultComponent,
		TableSkeletonComponent,
		StatsSkeletonComponent,
	],
	templateUrl: './attendance-reports.component.html',
	styleUrl: './attendance-reports.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceReportsComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(AttendanceReportsFacade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
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
}
