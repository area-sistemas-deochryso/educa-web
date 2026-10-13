import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
	EstudianteMisNotasDto,
	NOTA_MINIMA,
	NOTA_MAXIMA,
} from '@features/intranet/pages/estudiante/models';
import { NotaSimulada } from '../../services/estudiante-notas.models';
import { getNotaSeverity, formatNotaConConfig, getRotuloParcial } from '@intranet-shared/services/calificacion-config';
import { EduButton, EduDrawer, EduInputNumber, EduTag } from '@edu-ui';

@Component({
	selector: 'app-simulador-notas',
	standalone: true,
	imports: [FormsModule, EduDrawer, EduInputNumber, EduButton, EduTag],
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
	readonly coberturaSimulada = input(0);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly notaChange = output<{ calificacionId: number; nota: number | null }>();
	readonly resetSimulacion = output<void>();
	// #endregion

	/** Escala del salón del curso (INV-U06), resuelta por el BE. */
	readonly calificacionConfig = computed(() => this.curso().escalaCalificacion ?? null);

	readonly rotuloParcial = computed(() =>
		this.promedioSimulado() === null ? null : getRotuloParcial(this.coberturaSimulada()),
	);

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

	formatPeso(peso: number | null | undefined): string {
		return Number.isFinite(peso) ? ((peso as number) * 100).toFixed(0) : '0';
	}

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}
	// #endregion
}
