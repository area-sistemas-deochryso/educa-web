import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
	NOTA_MINIMA,
	NOTA_MAXIMA,
	GrupoNotaRow,
	GrupoMiembroInfo,
} from '@features/intranet/pages/profesor/models';
import {
	getNotaSeverity as getNotaSeverityFn,
	convertToLiteral,
} from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto, ConfiguracionLiteralDto } from '@data/models';
import { clampNota, literalMidpoint, sanitizeObservacion } from '../../calificar-dialog.helpers';
import { EduButton, EduInputNumber, EduInputText, EduSelect, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-calificar-grupo-list',
	standalone: true,
	imports: [FormsModule, EduButton, EduInputNumber, EduInputText, EduSelect, EduTag, EduTooltip],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificar-grupo-list.component.html',
	styleUrl: './calificar-grupo-list.component.scss',
})
export class CalificarGrupoListComponent {
	// #region Inputs
	/** Grupos ya filtrados. Se mutan en el lugar y el padre se entera vía `edited`. */
	readonly rows = input.required<GrupoNotaRow[]>();
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

	updateGrupoNota(grupo: GrupoNotaRow, nota: number | null): void {
		grupo.nota = nota === null ? null : clampNota(nota);
		this.edited.emit();
	}

	updateGrupoNotaLiteral(grupo: GrupoNotaRow, literal: ConfiguracionLiteralDto | null): void {
		this.updateGrupoNota(grupo, literalMidpoint(literal));
	}

	updateGrupoObservacion(grupo: GrupoNotaRow, observacion: string): void {
		grupo.observacion = sanitizeObservacion(observacion);
		this.edited.emit();
	}

	toggleMiembroOverride(grupo: GrupoNotaRow, miembro: GrupoMiembroInfo): void {
		if (miembro.esOverride) {
			miembro.esOverride = false;
			miembro.overrideNota = null;
		} else {
			miembro.esOverride = true;
			miembro.overrideNota = grupo.nota;
		}
		this.edited.emit();
	}

	updateMiembroOverride(miembro: GrupoMiembroInfo, nota: number | null): void {
		miembro.overrideNota = nota === null ? null : clampNota(nota);
		miembro.esOverride = miembro.overrideNota !== null;
		this.edited.emit();
	}

	updateMiembroOverrideLiteral(miembro: GrupoMiembroInfo, literal: ConfiguracionLiteralDto | null): void {
		this.updateMiembroOverride(miembro, literalMidpoint(literal));
	}
	// #endregion
}
