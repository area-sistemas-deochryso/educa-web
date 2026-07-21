// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';

import { UserPermissionsService } from '@core/services/permissions';
import { StatsSkeletonComponent } from '@intranet-shared/components';
import { formatDateLocalIso } from '@core/helpers';

import { RANGO_TIPOS, type RangoTipo } from '../../cross-role/attendance-reports/models';

import { AttendancePanelKpiTileComponent } from './components/attendance-panel-kpi-tile/attendance-panel-kpi-tile.component';
import { AttendancePanelBreakdownComponent } from './components/attendance-panel-breakdown/attendance-panel-breakdown.component';
import { AttendancePanelChartDiaComponent } from './components/attendance-panel-chart-dia/attendance-panel-chart-dia.component';
import { AttendancePanelChartLineComponent } from './components/attendance-panel-chart-line/attendance-panel-chart-line.component';
import { AttendancePanelChartHeatmapComponent } from './components/attendance-panel-chart-heatmap/attendance-panel-chart-heatmap.component';
import { AttendancePanelFacade } from './services';
import type { AttendancePanelBreakdownItem } from './models';
// #endregion

/**
 * Capability requerida para consultar una sede DISTINTA a la propia en modo Semana/Mes.
 * Coincide con `Capability.ASISTENCIA_ADMIN` del BE (`BaseApiController.ResolveSedeId`).
 */
const CAPABILITY_SEDE_CRUZADA = 'ASISTENCIA_ADMIN';

@Component({
	selector: 'app-attendance-panel',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		SelectModule,
		SelectButtonModule,
		DatePickerModule,
		StatsSkeletonComponent,
		AttendancePanelKpiTileComponent,
		AttendancePanelBreakdownComponent,
		AttendancePanelChartDiaComponent,
		AttendancePanelChartLineComponent,
		AttendancePanelChartHeatmapComponent,
	],
	templateUrl: './attendance-panel.component.html',
	styleUrl: './attendance-panel.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePanelComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(AttendancePanelFacade);
	private readonly userPermisos = inject(UserPermissionsService);
	private readonly router = inject(Router);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	readonly rangoOptions: { label: string; value: RangoTipo }[] = [
		{ label: 'Día', value: 'dia' },
		{ label: 'Semana', value: 'semana' },
		{ label: 'Mes', value: 'mes' },
	];
	// #endregion

	// #region Computed
	/**
	 * En Semana/Mes, cambiar de sede exige `ASISTENCIA_ADMIN` en el BE (si no, 403
	 * `ASISTENCIA_SEDE_CRUZADA_NO_AUTORIZADA`). En Día no hay restricción extra — ya está
	 * gateado a nivel superadmin en el propio endpoint de gestión.
	 */
	readonly sedeSelectorDisabled = computed(() => {
		const rango = this.vm().filters.rango;
		if (rango === 'dia') return false;
		return !this.userPermisos.hasCapability(CAPABILITY_SEDE_CRUZADA);
	});

	readonly sedeOptions = computed(() => this.vm().sedes.map((s) => ({ label: s.nombre, value: s.id })));
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.initSedePropia();
		this.facade.loadSedes();
		this.facade.loadData();
	}
	// #endregion

	// #region Handlers — filtros
	onSedeChange(sedeId: number | null): void {
		this.facade.setSede(sedeId);
	}

	onRangoChange(rango: RangoTipo): void {
		if (!rango || !(RANGO_TIPOS as readonly string[]).includes(rango)) return;
		this.facade.setRango(rango);
	}

	onFechaChange(fecha: Date): void {
		this.facade.setFecha(fecha);
	}
	// #endregion

	// #region Handlers — drill-down
	/** KPI tile → tab Gestión, con la fecha del día si el rango activo es Día. */
	irAGestion(): void {
		const filters = this.vm().filters;
		const queryParams: Record<string, string> = { tab: 'gestion' };
		if (filters.rango === 'dia') queryParams['fecha'] = formatDateLocalIso(filters.fecha);
		void this.router.navigate([], { queryParams });
	}

	/** Breakdown bar → tab Reportes, filtrado al tipo de persona y rango elegidos. */
	irAReportes(item: AttendancePanelBreakdownItem): void {
		const filters = this.vm().filters;
		void this.router.navigate([], {
			queryParams: { tab: 'reportes', tipoPersona: item.tipoPersona, rango: filters.rango },
		});
	}
	// #endregion
}
