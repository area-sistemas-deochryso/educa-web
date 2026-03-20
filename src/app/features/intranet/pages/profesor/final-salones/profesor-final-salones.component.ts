import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '@shared/components';
import { SalonesAdminTableComponent } from '@features/intranet/pages/admin/salones/components/salones-admin-table/salones-admin-table.component';
import { SalonDetailDialogComponent } from '@features/intranet/pages/admin/salones/components/salon-detail-dialog/salon-detail-dialog.component';
import { AprobarEstudianteDto, AprobacionMasivaDto, NivelEducativo } from './models';
import { ProfesorFinalSalonesFacade } from './services/profesor-final-salones.facade';

@Component({
	selector: 'app-profesor-final-salones',
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
		SalonesAdminTableComponent,
		SalonDetailDialogComponent,
	],
	providers: [MessageService],
	templateUrl: './profesor-final-salones.component.html',
	styleUrl: './profesor-final-salones.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfesorFinalSalonesComponent implements OnInit {
	// #region Dependencias
	private facade = inject(ProfesorFinalSalonesFacade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	readonly nivelTabIndex = (nivel: NivelEducativo): number => {
		const niveles = this.vm().nivelesDisponibles;
		return niveles.indexOf(nivel);
	};
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers — Tabs
	onTabChange(index: number): void {
		const niveles = this.vm().nivelesDisponibles;
		const nivel = niveles[index];
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
	// #endregion

	// #region Event handlers — Salones
	onSelectSalon(salonId: number): void {
		this.facade.openSalonDialog(salonId);
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
