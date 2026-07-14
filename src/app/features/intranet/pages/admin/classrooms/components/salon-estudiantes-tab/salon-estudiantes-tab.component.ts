import { Component, ChangeDetectionStrategy, inject, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';

import { EstudianteDisponibleDto, MOTIVOS_RETIRO } from '../../models';
import { ClassroomStudentsFacade } from './salon-estudiantes-tab.facade';

export interface SalonOption {
	id: number;
	label: string;
}

@Component({
	selector: 'app-classroom-students-tab',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		TagModule,
		TooltipModule,
		AutoCompleteModule,
		SelectModule,
		MessageModule,
	],
	templateUrl: './salon-estudiantes-tab.component.html',
	styleUrl: './salon-estudiantes-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomStudentsTabComponent {
	// #region Dependencias
	private readonly facade = inject(ClassroomStudentsFacade);
	// #endregion

	// #region Inputs
	readonly salonId = input.required<number>();
	readonly salonesDisponibles = input<SalonOption[]>([]);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local — búsqueda "Agregar"
	readonly selectedDisponible = signal<EstudianteDisponibleDto | null>(null);
	// #endregion

	// #region Estado local — acción por fila
	readonly activeRowAction = signal<{ estudianteId: number; tipo: 'transferir' | 'retirar' } | null>(null);
	readonly selectedSalonDestino = signal<number | null>(null);
	readonly selectedMotivo = signal<string | null>(null);
	readonly motivos: { value: string; label: string }[] = [...MOTIVOS_RETIRO];
	// #endregion

	constructor() {
		effect(() => {
			const id = this.salonId();
			this.facade.reset();
			this.facade.cargarEstudiantes(id);
		});
	}

	// #region Agregar
	onSearchDisponibles(event: AutoCompleteCompleteEvent): void {
		this.facade.buscarSinSalon(event.query);
	}

	onSelectDisponible(estudiante: EstudianteDisponibleDto): void {
		this.facade.agregar(this.salonId(), estudiante.estudianteId);
		this.selectedDisponible.set(null);
	}
	// #endregion

	// #region Transferir / Retirar — abrir/cerrar acción de fila
	openTransferir(estudianteId: number): void {
		this.activeRowAction.set({ estudianteId, tipo: 'transferir' });
		this.selectedSalonDestino.set(null);
	}

	openRetirar(estudianteId: number): void {
		this.activeRowAction.set({ estudianteId, tipo: 'retirar' });
		this.selectedMotivo.set(null);
	}

	cancelarAccion(): void {
		this.activeRowAction.set(null);
		this.facade.cancelarPendiente();
	}

	confirmarTransferir(estudianteId: number): void {
		const destino = this.selectedSalonDestino();
		if (!destino) return;
		this.facade.transferir(this.salonId(), estudianteId, destino);
	}

	confirmarRetirar(estudianteId: number): void {
		const motivo = this.selectedMotivo();
		if (!motivo) return;
		this.facade.retirar(this.salonId(), estudianteId, motivo);
	}

	confirmarPendienteConAdvertencia(): void {
		this.facade.confirmarPendiente(this.salonId());
	}

	cancelarPendiente(): void {
		this.facade.cancelarPendiente();
		this.activeRowAction.set(null);
	}
	// #endregion
}
