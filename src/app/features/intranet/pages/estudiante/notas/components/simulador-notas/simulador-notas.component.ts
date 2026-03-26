import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import {
	EstudianteMisNotasDto,
	NOTA_MINIMA,
	NOTA_MAXIMA,
} from '../../../models';
import { NotaSimulada } from '../../services/estudiante-notas.store';
import { getNotaSeverity, formatNotaConConfig } from '@shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';

@Component({
	selector: 'app-simulador-notas',
	standalone: true,
	imports: [CommonModule, FormsModule, DrawerModule, InputNumberModule, ButtonModule, TagModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './simulador-notas.component.html',
	styleUrl: './simulador-notas.component.scss',
})
export class SimuladorNotasComponent {
	// #region Inputs
	readonly visible = input(false);
	readonly curso = input.required<EstudianteMisNotasDto>();
	readonly simulaciones = input<NotaSimulada[]>([]);
	readonly promedioSimulado = input<number | null>(null);
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly notaChange = output<{ calificacionId: number; nota: number | null }>();
	readonly resetSimulacion = output<void>();
	// #endregion

	// #region Constants
	readonly notaMin = NOTA_MINIMA;
	readonly notaMax = NOTA_MAXIMA;
	// #endregion

	// #region Helpers
	getEvalTitulo(calificacionId: number): string {
		const eval_ = this.curso().evaluaciones.find((e) => e.id === calificacionId);
		return eval_?.titulo ?? '';
	}

	getEvalTipo(calificacionId: number): string {
		const eval_ = this.curso().evaluaciones.find((e) => e.id === calificacionId);
		const tipo = eval_?.tipo ?? '';
		return tipo;
	}

	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		return getNotaSeverity(nota, this.calificacionConfig());
	}

	formatNota(nota: number | null): string {
		return formatNotaConConfig(nota, this.calificacionConfig());
	}

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}
	// #endregion
}
