import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableSkeletonComponent } from '@intranet-shared/components/table-skeleton/table-skeleton.component';
import { StatsSkeletonComponent } from '@intranet-shared/components/stats-skeleton/stats-skeleton.component';
import { TABLE_SKELETON_COLUMNS } from './config/reportes-asistencia.config';
import { ReportesFiltrosComponent } from './components/reportes-filtros/reportes-filtros.component';
import { ReportesResumenComponent } from './components/reportes-resumen/reportes-resumen.component';
import { ReportesResultadoComponent } from './components/reportes-resultado/reportes-resultado.component';
import { ReportesAsistenciaFacade } from './services';
import { salonToOption, type EstadoFiltro, type RangoTipo } from './models';

@Component({
	selector: 'app-reportes-asistencia',
	standalone: true,
	imports: [
		ButtonModule,
		ReportesFiltrosComponent,
		ReportesResumenComponent,
		ReportesResultadoComponent,
		TableSkeletonComponent,
		StatsSkeletonComponent,
	],
	templateUrl: './reportes-asistencia.component.html',
	styleUrl: './reportes-asistencia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesAsistenciaComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ReportesAsistenciaFacade);
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
