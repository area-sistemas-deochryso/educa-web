import { Component, ChangeDetectionStrategy, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ErrorHandlerService, UserPermissionsService } from '@core/services';
import { EstudianteDisponibleDto, MOTIVOS_RETIRO } from '../../models';
import {
	MatriculaOfertaComponent,
	type MatriculaOfertaResultado,
	TITULO_AVISO_SIN_CARGO,
	avisoSinCargo,
} from '@features/intranet/pages/admin/pagos/matricula-oferta';
import { ClassroomStudentsFacade } from './salon-estudiantes-tab.facade';
import { EduAutoComplete, EduButton, EduMessage, EduSelect, EduTable, EduTag, EduTemplate, EduTooltip } from '@edu-ui';
import type { EduAutoCompleteCompleteEvent } from '@edu-ui';

export interface SalonOption {
	id: number;
	label: string;
}

@Component({
	selector: 'app-classroom-students-tab',
	standalone: true,
	imports: [
		FormsModule,
		EduTable,
		EduButton,
		EduTag,
		EduTooltip,
		EduTemplate,
		EduAutoComplete,
		EduSelect,
		EduMessage, MatriculaOfertaComponent],
	templateUrl: './salon-estudiantes-tab.component.html',
	styleUrl: './salon-estudiantes-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomStudentsTabComponent {
	// #region Dependencias
	private readonly facade = inject(ClassroomStudentsFacade);
	private readonly permisos = inject(UserPermissionsService);
	private readonly errorHandler = inject(ErrorHandlerService);
	// #endregion

	// #region Inputs
	readonly salonId = input.required<number>();
	/** Año del salón: el año de cobranza al que pertenece la matrícula que se ofrece generar (P123 F8). */
	readonly anio = input<number>(new Date().getFullYear());
	readonly salonesDisponibles = input<SalonOption[]>([]);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local — búsqueda "Agregar"
	readonly selectedDisponible = signal<EstudianteDisponibleDto | null>(null);
	/** Alumno recién agregado al que se le ofrece generar matrícula e inscripción (P123 F8). */
	readonly oferta = signal<{ estudianteId: number; nombre: string } | null>(null);
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
	onSearchDisponibles(event: EduAutoCompleteCompleteEvent): void {
		this.facade.buscarSinSalon(event.query);
	}

	onSelectDisponible(estudiante: EstudianteDisponibleDto): void {
		this.oferta.set(null);
		this.facade.agregar(this.salonId(), estudiante.estudianteId, () => this.ofrecerMatricula(estudiante));
		this.selectedDisponible.set(null);
	}
	// #endregion

	// #region Ofrecer matrícula (P123 F8)
	/** Solo con permiso de pagos: sin él, el alumno se agrega como siempre y no se ofrece nada. */
	private ofrecerMatricula(estudiante: EstudianteDisponibleDto): void {
		if (!this.permisos.hasCapability('PAGOS_API_MANAGE')) return;
		this.oferta.set({ estudianteId: estudiante.estudianteId, nombre: estudiante.nombreCompleto });
	}

	onOfertaTerminada(resultado: MatriculaOfertaResultado): void {
		const oferta = this.oferta();
		this.oferta.set(null);
		if (oferta && resultado.sinCargo) {
			this.errorHandler.showWarning(TITULO_AVISO_SIN_CARGO, avisoSinCargo(oferta.nombre));
		}
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
