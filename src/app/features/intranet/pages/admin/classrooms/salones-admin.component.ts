import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent, PeriodToggleComponent } from '@intranet-shared/components';
import { ClassroomsAdminFacade } from './services';
import { ClassroomsAdminTableComponent } from './components/salones-admin-table/salones-admin-table.component';
import { ConfigGradeDialogComponent } from './components/config-calificacion-dialog/config-calificacion-dialog.component';
import { ClosePeriodDialogComponent } from './components/cerrar-periodo-dialog/cerrar-periodo-dialog.component';
import { ClassroomDetailDialogComponent } from './components/salon-detail-dialog/salon-detail-dialog.component';
import {
	NivelEducativo,
	NIVELES,
	CrearConfiguracionCalificacionDto,
	ActualizarConfiguracionCalificacionDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	CrearSalonDto,
} from './models';
import { NuevoSalonDialogComponent } from './components/nuevo-salon-dialog/nuevo-salon-dialog.component';

@Component({
	selector: 'app-classrooms-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TabsModule,
		ButtonModule,
		TagModule,
		InputNumberModule,
		ToastModule,
		PageHeaderComponent,
		PeriodToggleComponent,
		ClassroomsAdminTableComponent,
		ConfigGradeDialogComponent,
		ClosePeriodDialogComponent,
		ClassroomDetailDialogComponent,
		NuevoSalonDialogComponent,
	],
	providers: [MessageService],
	templateUrl: './salones-admin.component.html',
	styleUrl: './salones-admin.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomsAdminComponent implements OnInit {
	// #region Dependencias
	private facade = inject(ClassroomsAdminFacade);
	private router = inject(Router);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Computed — brief 436
	/** Salones candidatos como destino de transferencia: todos menos el actualmente abierto. */
	readonly salonesDisponibles = computed(() => {
		const actualId = this.vm().selectedSalonId;
		return this.vm()
			.salones.filter((s) => s.id !== actualId)
			.map((s) => ({ id: s.id, label: `${s.grado} ${s.seccion} — ${s.sede}` }));
	});
	// #endregion

	// #region Estado local
	readonly niveles = NIVELES;
	readonly nivelTabIndex: Record<NivelEducativo, number> = {
		Inicial: 0,
		Primaria: 1,
		Secundaria: 2,
	};
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

	onGoToHorarios(salonId: number): void {
		this.router.navigate(['/intranet/admin/horarios'], { queryParams: { salonId } });
	}

	onGoToUsuarios(salonId: number): void {
		this.router.navigate(['/intranet/admin/usuarios'], { queryParams: { salonId } });
	}
	// #endregion

	// #region Event handlers — Nuevo salón
	onOpenNuevoSalonDialog(): void {
		this.facade.openNuevoSalonDialog();
	}

	onNuevoSalonDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeNuevoSalonDialog();
		}
	}

	onCrearSalon(dto: CrearSalonDto): void {
		this.facade.crearSalon(dto);
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
