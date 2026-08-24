import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent } from '@intranet-shared/components';
// eslint-disable-next-line layer-enforcement/imports-warn -- Razón: pendiente mover SalonesAdminTable y SalonDetailDialog a @intranet-shared (Plan maestro Carril B)
import { ClassroomsAdminTableComponent } from '@features/intranet/pages/admin/classrooms/components/salones-admin-table/salones-admin-table.component';
// eslint-disable-next-line layer-enforcement/imports-warn -- Razón: pendiente mover SalonesAdminTable y SalonDetailDialog a @intranet-shared (Plan maestro Carril B)
import { ClassroomDetailDialogComponent } from '@features/intranet/pages/admin/classrooms/components/salon-detail-dialog/salon-detail-dialog.component';
import { AprobarEstudianteDto, AprobacionMasivaDto, NivelEducativo } from './models';
import { TeacherFinalClassroomsFacade } from './services/profesor-final-salones.facade';
import { EduInputNumber, EduMessageService, EduTab, EduTabPanel, EduTabs, EduTag, EduToast } from '@edu-ui';
@Component({
	selector: 'app-teacher-final-classrooms',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		EduTabs, EduTab, EduTabPanel,
		ButtonModule,
		EduTag,
		EduInputNumber,
		EduToast,
		PageHeaderComponent,
		ClassroomsAdminTableComponent,
		ClassroomDetailDialogComponent],
	providers: [EduMessageService],
	templateUrl: './profesor-final-salones.component.html',
	styleUrl: './profesor-final-salones.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherFinalClassroomsComponent implements OnInit {
	// #region Dependencias
	private facade = inject(TeacherFinalClassroomsFacade);
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

	// #region Event handlers — EduTabs
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

	onLoadRendimiento(event: { salonId: number; horarioId: number }): void {
		this.facade.loadRendimientoEstudiantes(event.horarioId);
	}
	// #endregion
}
