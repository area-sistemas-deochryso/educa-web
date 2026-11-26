// #region Imports
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { EduDialog } from '@edu-ui';
import { PagoAdjuntosComponent } from './pago-adjuntos.component';
// #endregion

export interface PagoAdjuntosContexto {
	pagoId: number;
	/** `false` = pago anulado: los vouchers se ven pero no se agregan. */
	vigente: boolean;
}

/**
 * Diálogo del voucher de un pago, abierto desde la lista «Pagos» del estado de cuenta. Siempre está en el DOM
 * (`reference/dialogs-sync.md`); el panel se crea al abrir y se destruye al cerrar, así que cada apertura relee la lista.
 */
@Component({
	selector: 'app-pago-adjuntos-dialog',
	standalone: true,
	imports: [EduDialog, PagoAdjuntosComponent],
	template: `
		<edu-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[draggable]="false"
			[resizable]="false"
			header="Voucher del pago"
			[style]="{ width: '520px', maxWidth: '95vw' }"
			appendTo="body"
		>
			@if (contexto(); as ctx) {
				<app-pago-adjuntos [pagoId]="ctx.pagoId" [vigente]="ctx.vigente" />
			}
		</edu-dialog>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoAdjuntosDialogComponent {
	protected readonly visible = signal(false);
	protected readonly contexto = signal<PagoAdjuntosContexto | null>(null);

	open(contexto: PagoAdjuntosContexto): void {
		this.contexto.set(contexto);
		this.visible.set(true);
	}

	protected onVisibleChange(visible: boolean): void {
		if (visible) return;
		this.visible.set(false);
		this.contexto.set(null);
	}
}
