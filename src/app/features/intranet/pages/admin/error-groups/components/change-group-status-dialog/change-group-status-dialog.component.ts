import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import {
	CambiarEstadoErrorGroup,
	ESTADO_LABEL_MAP,
	ESTADO_SEVERITY_MAP,
	ESTADO_TRANSITIONS_MAP,
	ErrorGroupEstado,
	ErrorGroupLista,
} from '../../models';

const OBSERVACION_MAX = 1000;

interface EstadoOption {
	label: string;
	value: ErrorGroupEstado;
}

/**
 * Dialog para cambiar el estado de un grupo. El select solo lista destinos
 * válidos según `ESTADO_TRANSITIONS_MAP` (defensa en profundidad — el BE
 * también valida con `ERRORGROUP_TRANSICION_INVALIDA`).
 *
 * El idem (X→X) queda inalcanzable porque el estado actual no aparece en
 * las opciones.
 */
@Component({
	selector: 'app-change-group-status-dialog',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DialogModule,
		InputTextModule,
		SelectModule,
		TagModule,
		TextareaModule,
	],
	templateUrl: './change-group-status-dialog.component.html',
	styleUrl: './change-group-status-dialog.component.scss',
})
export class ChangeGroupStatusDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input<boolean>(false);
	readonly group = input<ErrorGroupLista | null>(null);
	readonly loading = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly confirmStatus = output<{ group: ErrorGroupLista; dto: CambiarEstadoErrorGroup }>();
	readonly cancelStatus = output<void>();
	// #endregion

	// #region Estado interno
	private readonly _estado = signal<ErrorGroupEstado | null>(null);
	private readonly _observacion = signal<string>('');

	readonly estado = this._estado.asReadonly();
	readonly observacion = this._observacion.asReadonly();
	readonly observacionMax = OBSERVACION_MAX;

	readonly estadoLabelMap = ESTADO_LABEL_MAP;
	readonly estadoSeverityMap = ESTADO_SEVERITY_MAP;

	readonly estadoOptions = computed<EstadoOption[]>(() => {
		const grp = this.group();
		if (!grp) return [];
		const destinos = ESTADO_TRANSITIONS_MAP[grp.estado] ?? [];
		return destinos.map((dest) => ({
			label: ESTADO_LABEL_MAP[dest],
			value: dest,
		}));
	});

	readonly canSubmit = computed(() => {
		if (!this._estado()) return false;
		if (this._observacion().length > OBSERVACION_MAX) return false;
		return !this.loading();
	});

	readonly observacionLength = computed(() => this._observacion().length);
	// #endregion

	constructor() {
		// Reset al abrir el dialog
		effect(() => {
			const isVisible = this.visible();
			if (isVisible) {
				this._estado.set(null);
				this._observacion.set('');
			}
		});
	}

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.cancelStatus.emit();
		}
		this.visibleChange.emit(visible);
	}

	onEstadoChange(estado: ErrorGroupEstado | null): void {
		this._estado.set(estado);
	}

	onObservacionChange(obs: string): void {
		this._observacion.set(obs);
	}

	onCancel(): void {
		this.cancelStatus.emit();
	}

	onConfirm(): void {
		const grp = this.group();
		const estado = this._estado();
		if (!grp || !estado) return;

		const observacion = this._observacion().trim();
		const dto: CambiarEstadoErrorGroup = {
			estado,
			observacion: observacion ? observacion : null,
			rowVersion: grp.rowVersion,
		};
		this.confirmStatus.emit({ group: grp, dto });
	}
	// #endregion

	// #region Helpers
	getEstadoLabel(estado: string): string {
		return this.estadoLabelMap[estado as ErrorGroupEstado] ?? estado;
	}

	getEstadoSeverity(
		estado: string,
	): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
		return this.estadoSeverityMap[estado as ErrorGroupEstado] ?? 'secondary';
	}
	// #endregion
}
