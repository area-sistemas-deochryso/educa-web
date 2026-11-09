// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { RegistrarAjustePayload } from '@data/models';
import { EduButton, EduDialog, EduInputNumber, EduMessage, EduSelect, EduTextarea } from '@edu-ui';
import { formatSoles } from '../utils/pagos-format.util';
import { ajusteValido, armarPayloadAjuste } from './acciones-cuenta.logic';
// #endregion

export interface AjusteContexto {
	cargoId: number;
	/** Nombre del cargo para el encabezado (concepto · cuota). */
	cargo: string;
	/** Tope orientativo; el BE decide. */
	tope: number;
}

const TIPOS: { label: string; value: RegistrarAjustePayload['tipo'] }[] = [
	{ label: 'Descuento', value: 'DESCUENTO' },
	{ label: 'En especie', value: 'ESPECIE' },
];

/** Diálogo para registrar un descuento o una entrega en especie sobre un cargo. El motivo es obligatorio solo en descuentos. */
@Component({
	selector: 'app-ajuste-dialog',
	standalone: true,
	imports: [FormsModule, EduDialog, EduButton, EduInputNumber, EduMessage, EduSelect, EduTextarea],
	templateUrl: './ajuste-dialog.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AjusteDialogComponent {
	readonly guardando = input(false);
	readonly error = input<string | null>(null);
	readonly confirmar = output<RegistrarAjustePayload>();
	readonly cancelar = output<void>();

	protected readonly tipos = TIPOS;
	protected readonly soles = formatSoles;
	protected readonly visible = signal(false);
	protected readonly contexto = signal<AjusteContexto | null>(null);
	protected readonly tipo = signal<RegistrarAjustePayload['tipo']>('DESCUENTO');
	protected readonly monto = signal<number | null>(null);
	protected readonly motivo = signal('');

	protected readonly motivoObligatorio = computed(() => this.tipo() === 'DESCUENTO');
	protected readonly puedeGuardar = computed(
		() => !this.guardando() && ajusteValido({ tipo: this.tipo(), monto: this.monto() ?? 0, motivo: this.motivo() }),
	);

	open(contexto: AjusteContexto): void {
		this.contexto.set(contexto);
		this.tipo.set('DESCUENTO');
		this.monto.set(null);
		this.motivo.set('');
		this.visible.set(true);
	}

	close(): void {
		this.visible.set(false);
	}

	protected onVisibleChange(visible: boolean): void {
		if (visible) return;
		this.visible.set(false);
		this.cancelar.emit();
	}

	protected aceptar(): void {
		const ctx = this.contexto();
		if (!ctx || !this.puedeGuardar()) return;
		this.confirmar.emit(
			armarPayloadAjuste({ cargoId: ctx.cargoId, tipo: this.tipo(), monto: this.monto() ?? 0, motivo: this.motivo() }),
		);
	}
}
