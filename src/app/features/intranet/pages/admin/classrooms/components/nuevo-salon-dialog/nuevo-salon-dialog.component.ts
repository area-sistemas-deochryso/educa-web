import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';

import { GradosService } from '@features/intranet/pages/admin/cursos/services';

import { CrearSalonDto } from '../../models';
import { ClassroomsAdminFacade } from '../../services/salones-admin.facade';

@Component({
	selector: 'app-nuevo-salon-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, DialogModule, ButtonModule, SelectModule, InputNumberModule],
	templateUrl: './nuevo-salon-dialog.component.html',
	styleUrl: './nuevo-salon-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevoSalonDialogComponent {
	// #region Dependencias
	private readonly gradosService = inject(GradosService);
	private readonly facade = inject(ClassroomsAdminFacade);
	// #endregion

	// #region Inputs / Outputs
	readonly visible = input(false);
	readonly anioDefault = input(new Date().getFullYear());
	readonly loading = input(false);

	readonly visibleChange = output<boolean>();
	readonly crear = output<CrearSalonDto>();
	// #endregion

	// #region Catálogos
	readonly grados = signal<{ id: number; nombre: string }[]>([]);
	readonly secciones = signal<{ id: number; nombre: string }[]>([]);
	readonly sedes = signal<{ id: number; nombre: string }[]>([]);
	// #endregion

	// #region Estado local del formulario
	readonly gradoId = signal<number | null>(null);
	readonly seccionId = signal<number | null>(null);
	readonly sedeId = signal<number | null>(null);
	readonly anio = signal(this.anioDefault());
	// #endregion

	readonly isFormValid = computed(
		() => this.gradoId() !== null && this.seccionId() !== null && this.sedeId() !== null && !!this.anio(),
	);

	constructor() {
		this.gradosService.getGrados().subscribe((grados) => this.grados.set(grados));
		this.facade.getSecciones().subscribe((secciones) => this.secciones.set(secciones));
		this.facade.getSedes().subscribe((sedes) => this.sedes.set(sedes));

		effect(() => {
			if (this.visible()) {
				this.gradoId.set(null);
				this.seccionId.set(null);
				this.sedeId.set(null);
				this.anio.set(this.anioDefault());
			}
		});
	}

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onSave(): void {
		if (!this.isFormValid()) return;
		this.crear.emit({
			gradoId: this.gradoId()!,
			seccionId: this.seccionId()!,
			sedeId: this.sedeId()!,
			anio: this.anio(),
		});
	}
}
