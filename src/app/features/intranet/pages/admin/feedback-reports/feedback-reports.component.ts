// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import {
	REPORTE_ESTADOS,
	REPORTE_TIPO_LABEL_MAP,
	REPORTE_TIPO_OPTIONS,
	ReporteEstado,
	ReporteUsuarioListaDto,
} from '@core/services/feedback';
import { PageHeaderComponent } from '@intranet-shared/components';
import { CorrelationIdPillComponent } from '@intranet-shared/components';

import { HubContextBannerComponent, readHubContext } from '../monitoreo/shared';
import { FeedbackReportsFacade } from './services';

// #endregion
// #region Implementation
interface EstadoOption {
	label: string;
	value: ReporteEstado;
}

@Component({
	selector: 'app-feedback-reports',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		TagModule,
		ButtonModule,
		ConfirmDialogModule,
		SelectModule,
		DatePickerModule,
		DrawerModule,
		TextareaModule,
		TooltipModule,
		CorrelationIdPillComponent,
		PageHeaderComponent,
		HubContextBannerComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './feedback-reports.component.html',
	styleUrl: './feedback-reports.component.scss',
})
export class FeedbackReportsComponent implements OnInit {
	private readonly facade = inject(FeedbackReportsFacade);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	readonly vm = this.facade.vm;
	readonly tipoOptions = REPORTE_TIPO_OPTIONS;
	readonly tipoLabelMap = REPORTE_TIPO_LABEL_MAP;

	readonly estadoOptions: EstadoOption[] = REPORTE_ESTADOS.map((e) => ({
		label: this.estadoLabel(e),
		value: e,
	}));

	// Estado local del formulario de cambio de estado en el drawer
	readonly nuevoEstado = signal<ReporteEstado | null>(null);
	readonly observacionCambio = signal<string>('');
	readonly hubFiltered = signal(false);
	readonly hubFilterMessage = signal('');

	ngOnInit(): void {
		const hubCtx = readHubContext(this.route);
		if (hubCtx.fromHub && hubCtx.level) {
			const estado: ReporteEstado = hubCtx.level === 'critical' ? 'NUEVO' : 'EN_PROGRESO';
			this.facade.setFilterEstado(estado);
			this.hubFiltered.set(true);
			this.hubFilterMessage.set(`Filtrado desde el hub — mostrando reportes ${this.estadoLabel(estado)}`);
		}

		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const correlationId = params.get('correlationId');
				if (correlationId) {
					this.facade.setFilterCorrelationId(correlationId);
					this.facade.loadEstadisticas();
				} else {
					this.facade.loadAll();
				}
			});
	}

	// #region Handlers — Filtros
	onFilterTipoChange(v: string | null): void {
		this.facade.setFilterTipo(v);
	}

	onFilterEstadoChange(v: string | null): void {
		this.facade.setFilterEstado(v);
	}

	onFilterDesdeChange(v: Date | null): void {
		this.facade.setFilterDesde(v);
	}

	onFilterHastaChange(v: Date | null): void {
		this.facade.setFilterHasta(v);
	}

	onClearFilters(): void {
		this.facade.clearFilters();
		this.hubFiltered.set(false);
	}

	clearHubFilter(): void {
		this.onClearFilters();
	}

	onRefresh(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Handlers — Drawer
	onRowClick(item: ReporteUsuarioListaDto): void {
		this.nuevoEstado.set(item.estado);
		this.observacionCambio.set('');
		this.facade.openDetalle(item);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetalle();
		}
	}

	onGuardarCambioEstado(): void {
		const estado = this.nuevoEstado();
		if (!estado) return;
		const obs = this.observacionCambio().trim();
		this.facade.cambiarEstado(estado, obs || null);
	}

	onDeleteReport(): void {
		const detalle = this.vm().detalle;
		if (!detalle) return;

		const fecha = new Date(detalle.fechaReg).toLocaleString('es-PE');
		const tipo = this.tipoLabel(detalle.tipo);
		const descripcion = detalle.descripcion.length > 100
			? detalle.descripcion.slice(0, 100) + '…'
			: detalle.descripcion;
		const usuario = detalle.usuarioNombre || detalle.usuarioRol || 'Anónimo';

		this.confirmationService.confirm({
			header: 'Confirmar eliminación',
			message: `¿Eliminar el reporte #${detalle.id}?

Fecha: ${fecha}
Tipo: ${tipo}
Usuario: ${usuario}
Estado: ${this.estadoLabel(detalle.estado)}
Descripción: "${descripcion}"

Esta acción es irreversible.`,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Sí, eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.facade.deleteReporte(detalle.id);
			},
		});
	}
	// #endregion

	// #region Helpers visuales
	estadoSeverity(estado: ReporteEstado): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
		switch (estado) {
			case 'NUEVO':
				return 'info';
			case 'REVISADO':
			case 'EN_PROGRESO':
				return 'warn';
			case 'RESUELTO':
				return 'success';
			case 'DESCARTADO':
				return 'secondary';
			default:
				return 'secondary';
		}
	}

	estadoLabel(estado: ReporteEstado): string {
		const map: Record<ReporteEstado, string> = {
			NUEVO: 'Nuevo',
			REVISADO: 'Revisado',
			EN_PROGRESO: 'En progreso',
			RESUELTO: 'Resuelto',
			DESCARTADO: 'Descartado',
		};
		return map[estado] ?? estado;
	}

	tipoLabel(tipo: string): string {
		return this.tipoLabelMap[tipo as keyof typeof this.tipoLabelMap] ?? tipo;
	}
	// #endregion
}
// #endregion
