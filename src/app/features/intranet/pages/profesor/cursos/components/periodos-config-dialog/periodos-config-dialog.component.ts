import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { PeriodoCalificacionDto, CrearPeriodoDto } from '../../../models';

@Component({
	selector: 'app-periodos-config-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		InputNumberModule,
		TooltipModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './periodos-config-dialog.component.html',
	styleUrl: './periodos-config-dialog.component.scss',
})
export class PeriodosConfigDialogComponent {
	// #region Inputs
	readonly visible = input(false);
	readonly saving = input(false);
	readonly periodos = input<PeriodoCalificacionDto[]>([]);
	readonly contenidoId = input<number | null>(null);
	readonly totalSemanas = input(16);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly crearPeriodo = output<CrearPeriodoDto>();
	readonly eliminarPeriodo = output<number>();
	// #endregion

	// #region Estado local
	readonly newPeriodo = signal({
		nombre: '',
		semanaInicio: 1,
		semanaFin: 4,
	});
	// #endregion

	// #region Computed
	readonly nextOrden = computed(() => {
		const periodos = this.periodos();
		return periodos.length > 0 ? Math.max(...periodos.map((p) => p.orden)) + 1 : 1;
	});

	readonly isFormValid = computed(() => {
		const p = this.newPeriodo();
		return (
			p.nombre.trim().length > 0 &&
			p.semanaInicio >= 1 &&
			p.semanaFin >= p.semanaInicio &&
			p.semanaFin <= this.totalSemanas()
		);
	});
	// #endregion

	// #region Handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
		}
	}

	updateNewPeriodo(field: string, value: string | number): void {
		this.newPeriodo.update((p) => ({ ...p, [field]: value }));
	}

	onCrear(): void {
		if (!this.isFormValid() || !this.contenidoId()) return;

		const p = this.newPeriodo();
		const dto: CrearPeriodoDto = {
			cursoContenidoId: this.contenidoId()!,
			nombre: p.nombre.trim(),
			orden: this.nextOrden(),
			semanaInicio: p.semanaInicio,
			semanaFin: p.semanaFin,
		};

		this.crearPeriodo.emit(dto);
		this.newPeriodo.set({ nombre: '', semanaInicio: 1, semanaFin: 4 });
	}

	onEliminar(periodoId: number): void {
		this.eliminarPeriodo.emit(periodoId);
	}
	// #endregion
}
