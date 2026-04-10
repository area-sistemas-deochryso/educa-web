import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import {
	AprobacionEstudianteListDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	SalonAdminListDto,
	AprobacionEstado,
} from '../../models';

@Component({
	selector: 'app-classroom-approval-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, CheckboxModule, TooltipModule],
	templateUrl: './salon-aprobacion-tab.component.html',
	styleUrl: './salon-aprobacion-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomApprovalTabComponent {
	// #region Inputs / Outputs
	readonly salon = input<SalonAdminListDto | null>(null);
	readonly aprobaciones = input<AprobacionEstudianteListDto[]>([]);
	readonly loading = input(false);
	readonly periodoId = input<number | null>(null);
	readonly periodoCerrado = input(false);

	readonly aprobar = output<AprobarEstudianteDto>();
	readonly aprobarMasivo = output<AprobacionMasivaDto>();
	// #endregion

	// #region Estado local
	readonly selectedIds = signal<Set<number>>(new Set());
	// #endregion

	// #region Computed
	readonly resumen = computed(() => {
		const aprobaciones = this.aprobaciones();
		return {
			total: aprobaciones.length,
			aprobados: aprobaciones.filter((a) => a.estado === 'APROBADO').length,
			desaprobados: aprobaciones.filter((a) => a.estado === 'DESAPROBADO').length,
			pendientes: aprobaciones.filter((a) => a.estado === 'PENDIENTE').length,
		};
	});

	readonly allSelected = computed(() => {
		const aprobaciones = this.aprobaciones();
		const selected = this.selectedIds();
		return aprobaciones.length > 0 && aprobaciones.every((a) => selected.has(a.estudianteId));
	});

	readonly someSelected = computed(() => {
		const selected = this.selectedIds();
		return selected.size > 0;
	});

	readonly selectedCount = computed(() => this.selectedIds().size);
	// #endregion

	// #region Event handlers — selección
	toggleSelectAll(): void {
		if (this.allSelected()) {
			this.selectedIds.set(new Set());
		} else {
			const ids = this.aprobaciones().map((a) => a.estudianteId);
			this.selectedIds.set(new Set(ids));
		}
	}

	toggleStudent(estudianteId: number): void {
		this.selectedIds.update((current) => {
			const next = new Set(current);
			if (next.has(estudianteId)) {
				next.delete(estudianteId);
			} else {
				next.add(estudianteId);
			}
			return next;
		});
	}

	isSelected(estudianteId: number): boolean {
		return this.selectedIds().has(estudianteId);
	}
	// #endregion

	// #region Event handlers — aprobación
	onAprobarIndividual(aprobacion: AprobacionEstudianteListDto, estado: AprobacionEstado): void {
		const pid = this.periodoId();
		if (!pid) return;

		const dto: AprobarEstudianteDto = {
			estudianteId: aprobacion.estudianteId,
			salonId: aprobacion.salonId,
			periodoId: pid,
			estado,
			esVacacional: false,
			promedioFinal: aprobacion.promedioFinal,
			observacion: null,
		};
		this.aprobar.emit(dto);
	}

	onAprobarSeleccionados(estado: AprobacionEstado): void {
		const pid = this.periodoId();
		const s = this.salon();
		if (!pid || !s) return;

		const ids = this.selectedIds();
		const seleccionados = this.aprobaciones().filter((a) => ids.has(a.estudianteId));
		if (seleccionados.length === 0) return;

		const dto: AprobacionMasivaDto = {
			salonId: s.id,
			periodoId: pid,
			aprobaciones: seleccionados.map((a) => ({
				estudianteId: a.estudianteId,
				estado,
				esVacacional: false,
				promedioFinal: a.promedioFinal,
				observacion: null,
			})),
		};
		this.aprobarMasivo.emit(dto);
		this.selectedIds.set(new Set());
	}
	// #endregion

	// #region Helpers
	getEstadoSeverity(estado: AprobacionEstado): 'success' | 'danger' | 'warn' | 'secondary' {
		switch (estado) {
			case 'APROBADO':
				return 'success';
			case 'DESAPROBADO':
				return 'danger';
			case 'PENDIENTE':
				return 'warn';
			default:
				return 'secondary';
		}
	}

	getEstadoLabel(estado: AprobacionEstado): string {
		switch (estado) {
			case 'APROBADO':
				return 'Aprobado';
			case 'DESAPROBADO':
				return 'Desaprobado';
			case 'PENDIENTE':
				return 'Pendiente';
			default:
				return estado;
		}
	}
	// #endregion
}
