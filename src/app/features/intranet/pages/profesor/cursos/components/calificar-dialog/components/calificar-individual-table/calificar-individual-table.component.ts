import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NOTA_MINIMA, NOTA_MAXIMA, NotaRow } from '@features/intranet/pages/profesor/models';
import {
	getNotaSeverity as getNotaSeverityFn,
	convertToLiteral,
} from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto, ConfiguracionLiteralDto } from '@data/models';
import { clampNota, literalMidpoint, sanitizeObservacion } from '../../calificar-dialog.helpers';
import { EduInputNumber, EduInputText, EduSelect, EduTable, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-calificar-individual-table',
	standalone: true,
	imports: [FormsModule, EduInputNumber, EduInputText, EduSelect, EduTable, EduTag, EduTooltip],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificar-individual-table.component.html',
	styleUrl: './calificar-individual-table.component.scss',
})
export class CalificarIndividualTableComponent {
	// #region Inputs
	/** Filas ya filtradas. Se mutan en el lugar y el padre se entera vía `edited`. */
	readonly rows = input.required<NotaRow[]>();
	readonly config = input<ConfiguracionCalificacionListDto | null>(null);
	readonly isLiteral = input(false);
	readonly literales = input<ConfiguracionLiteralDto[]>([]);
	// #endregion

	// #region Outputs
	readonly edited = output<void>();
	// #endregion

	readonly NOTA_MINIMA = NOTA_MINIMA;
	readonly NOTA_MAXIMA = NOTA_MAXIMA;

	// #region Handlers
	getLiteralForNota(nota: number | null): ConfiguracionLiteralDto | null {
		return convertToLiteral(nota, this.config());
	}

	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		return getNotaSeverityFn(nota, this.config());
	}

	updateNota(row: NotaRow, nota: number | null): void {
		row.nota = nota === null ? null : clampNota(nota);
		this.edited.emit();
	}

	updateNotaLiteral(row: NotaRow, literal: ConfiguracionLiteralDto | null): void {
		this.updateNota(row, literalMidpoint(literal));
	}

	updateObservacion(row: NotaRow, observacion: string): void {
		row.observacion = sanitizeObservacion(observacion);
		this.edited.emit();
	}
	// #endregion
}
