import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '@shared/components';
import { SalonesAdminFacade } from './services';
import { SalonesAdminTableComponent } from './components/salones-admin-table/salones-admin-table.component';
import { ConfigCalificacionDialogComponent } from './components/config-calificacion-dialog/config-calificacion-dialog.component';
import { CerrarPeriodoDialogComponent } from './components/cerrar-periodo-dialog/cerrar-periodo-dialog.component';
import { SalonDetailDialogComponent } from './components/salon-detail-dialog/salon-detail-dialog.component';
import {
	NivelEducativo,
	NIVELES,
	CrearConfiguracionCalificacionDto,
	ActualizarConfiguracionCalificacionDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
} from './models';

@Component({
	selector: 'app-salones-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TabsModule,
		ButtonModule,
		TagModule,
		InputNumberModule,
		SelectButtonModule,
		ToastModule,
		PageHeaderComponent,
		SalonesAdminTableComponent,
		ConfigCalificacionDialogComponent,
		CerrarPeriodoDialogComponent,
		SalonDetailDialogComponent,
	],
	providers: [MessageService],
	templateUrl: './salones-admin.component.html',
	styleUrl: './salones-admin.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonesAdminComponent implements OnInit {
	// #region Dependencias
	private facade = inject(SalonesAdminFacade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	readonly niveles = NIVELES;
	readonly nivelTabIndex: Record<NivelEducativo, number> = {
		Inicial: 0,
		Primaria: 1,
		Secundaria: 2,
	};
	readonly periodoOptions = [
		{ label: 'Regular', value: false },
		{ label: 'Verano', value: true },
	];
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers — Tabs
	onTabChange(index: number): void {
		const nivel = this.niveles[index];
		if (nivel) {
			this.facade.setNivel(nivel);
		}
	}

	onAnioChange(anio: number): void {
		if (anio && anio >= 2020 && anio <= 2030) {
			this.facade.setAnio(anio);
		}
	}

	onRefresh(): void {
		this.facade.loadAll();
	}

	onPeriodoChange(esVerano: boolean): void {
		this.facade.setEsVerano(esVerano);
	}
	// #endregion

	// #region Event handlers — Salones
	onSelectSalon(salonId: number): void {
		this.facade.openSalonDialog(salonId);
	}
	// #endregion

	// #region Event handlers — Config dialog
	onOpenConfigDialog(): void {
		this.facade.openConfigDialog();
	}

	onConfigDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeConfigDialog();
		}
	}

	onCrearConfig(dto: CrearConfiguracionCalificacionDto): void {
		this.facade.crearConfiguracion(dto);
	}

	onActualizarConfig(event: { id: number; dto: ActualizarConfiguracionCalificacionDto }): void {
		this.facade.actualizarConfiguracion(event.id, event.dto);
	}
	// #endregion

	// #region Event handlers — Cerrar periodo
	onOpenCerrarPeriodo(): void {
		this.facade.openCerrarPeriodoDialog();
	}

	onCerrarPeriodoDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeCerrarPeriodoDialog();
		}
	}

	onConfirmarCierrePeriodo(periodoId: number): void {
		this.facade.cerrarPeriodo(periodoId);
	}
	// #endregion

	// #region Event handlers — Salon detail dialog
	onSalonDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeSalonDialog();
		}
	}

	onAprobarEstudiante(dto: AprobarEstudianteDto): void {
		this.facade.aprobarEstudiante(dto);
	}

	onAprobarMasivo(dto: AprobacionMasivaDto): void {
		this.facade.aprobarMasivo(dto);
	}

	onLoadAsistencia(event: { grado: string; seccion: string; mes: number; anio: number }): void {
		this.facade.loadAsistenciaSalon(event.grado, event.seccion, event.mes, event.anio);
	}

	onLoadNotas(event: { salonId: number; cursoId: number }): void {
		this.facade.loadNotasSalon(event.salonId, event.cursoId);
	}
	// #endregion
}
